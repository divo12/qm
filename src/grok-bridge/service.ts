import { randomUUID } from "node:crypto";
import { personalScope, type ScopeId } from "../types.ts";
import {
  GROK_BRIDGE_DEFAULT_TTL_MS,
  GROK_BRIDGE_MAX_TTL_MS,
  GROK_BRIDGE_PROTOCOL,
  GROK_BRIDGE_QUEUE_CAP,
  GROK_BRIDGE_SKILL_REVISION,
  grokDisplayName,
  hashToken,
  mintCallbackToken,
  normalizeAgentName,
  parseBearer,
  tokenMatches,
} from "./crypto.ts";
import { inFlightCount, nextQueued, type JobStore } from "./job-store.ts";
import type { PairingStore } from "./pairing-store.ts";
import { parseEventEnvelope } from "./protocol.ts";
import {
  GrokBridgeError,
  IN_FLIGHT_JOB_STATUSES,
  TERMINAL_JOB_STATUSES,
  type EventEnvelope,
  type GrokJob,
  type GrokPairing,
  type InboundCreds,
  type JobEnvelope,
  type JobView,
  type OutboundPort,
  type PairingView,
  type ProjectorPort,
  type SecretVault,
  type SessionAccess,
} from "./types.ts";

export interface GrokBridge {
  requestPairing(input: {
    agentName: string;
    ownerPrincipalId: string;
    actorId: string;
    actorType: "internal" | "guest";
    originScopeId: ScopeId;
  }): Promise<PairingView>;
  decidePairing(id: string, ownerId: string, decision: "accept" | "decline"): Promise<PairingView>;
  completeInbound(id: string, ownerId: string, inbound: InboundCreds): Promise<PairingView>;
  revoke(id: string, actorId: string): Promise<void>;
  dispatch(input: {
    agentName: string;
    ownerPrincipalId: string;
    originSessionId: string;
    originActorId: string;
    actorType: "internal" | "guest";
    instruction: string;
    callbackBaseUrl: string;
  }): Promise<JobView>;
  ingest(jobId: string, raw: unknown, authorizationHeader: string | undefined): Promise<{ duplicate: boolean }>;
  getJob(jobId: string, viewerId: string): Promise<JobView>;
}

export interface GrokBridgeDeps {
  pairings: PairingStore;
  jobs: JobStore;
  secrets: SecretVault;
  sessions: SessionAccess;
  outbound: OutboundPort;
  projector: ProjectorPort;
  now?: () => number;
  id?: () => string;
  mintToken?: () => string;
}

export function createGrokBridge(deps: GrokBridgeDeps): GrokBridge {
  const now = deps.now ?? Date.now;
  const newId = deps.id ?? randomUUID;
  const mintToken = deps.mintToken ?? mintCallbackToken;

  const toPairingView = (pairing: GrokPairing): PairingView => ({
    id: pairing.id,
    agentName: pairing.agentName,
    ownerPrincipalId: pairing.ownerPrincipalId,
    grokDisplayName: pairing.grokDisplayName,
    ...(pairing.grokBotId ? { grokBotId: pairing.grokBotId } : {}),
    skillRevision: pairing.skillRevision,
    consent: pairing.consent,
    status: pairing.status,
    originScopeId: pairing.originScopeId,
  });

  const toJobView = async (job: GrokJob): Promise<JobView> => {
    const pairing = await deps.pairings.get(job.pairingId);
    return {
      id: job.id,
      pairingId: job.pairingId,
      agentName: pairing?.agentName ?? "unknown",
      originSessionId: job.originSessionId,
      originActorId: job.originActorId,
      instruction: job.instruction,
      status: job.status,
      seqWatermark: job.seqWatermark,
      ...(job.summary ? { summary: job.summary } : {}),
      expiresAt: job.expiresAt,
    };
  };

  async function expireIfDue(job: GrokJob): Promise<GrokJob> {
    if (TERMINAL_JOB_STATUSES.has(job.status) || now() < job.expiresAt) return job;
    const expired: GrokJob = {
      ...job,
      status: "expired",
      summary: job.summary ?? "timed out waiting for Grok Bot",
      pendingEvents: [],
      updatedAt: now(),
    };
    await deps.jobs.save(expired);
    return expired;
  }

  async function requireOwner(pairing: GrokPairing, ownerId: string): Promise<void> {
    if (pairing.ownerPrincipalId !== ownerId) {
      throw new GrokBridgeError("forbidden", 403, "only the pairing owner can do that");
    }
  }

  async function kickQueue(pairingId: string, callbackBaseUrl: string): Promise<void> {
    const jobs = await Promise.all((await deps.jobs.listByPairing(pairingId)).map(expireIfDue));
    const hasActive = jobs.some((job) => IN_FLIGHT_JOB_STATUSES.has(job.status) && job.status !== "queued");
    if (hasActive) return;
    const queued = nextQueued(jobs);
    if (!queued) return;
    await sendOutbound(queued, callbackBaseUrl);
  }

  async function sendOutbound(job: GrokJob, callbackBaseUrl: string): Promise<GrokJob> {
    const pairing = await deps.pairings.get(job.pairingId);
    if (!pairing?.inboundRef || pairing.status !== "paired") {
      const failed: GrokJob = { ...job, status: "failed", summary: "pairing is not ready", updatedAt: now() };
      await deps.jobs.save(failed);
      return failed;
    }
    const secret = await deps.secrets.get(pairing.inboundRef);
    if (!secret) {
      await deps.pairings.save({ ...pairing, status: "degraded", updatedAt: now() });
      const failed: GrokJob = { ...job, status: "failed", summary: "inbound credentials missing", updatedAt: now() };
      await deps.jobs.save(failed);
      return failed;
    }
    const token = mintToken();
    const envelope: JobEnvelope = {
      protocol: GROK_BRIDGE_PROTOCOL,
      job_id: job.id,
      qm_agent: pairing.agentName,
      qm_session_id: job.originSessionId,
      instruction: job.instruction,
      callback_url: `${callbackBaseUrl.replace(/\/$/, "")}/v1/grok-bridge/jobs/${job.id}/events`,
      callback_token: token,
      reply_required: true,
      expires_at: new Date(job.expiresAt).toISOString(),
      approval_policy: "owner-must-approve-side-effects",
    };
    const dispatched: GrokJob = {
      ...job,
      status: "dispatched",
      callbackTokenHash: hashToken(token),
      updatedAt: now(),
    };
    await deps.jobs.save(dispatched);
    const posted = await deps.outbound.postJob(secret.url, secret.bearer, envelope);
    if (posted.ok) return dispatched;
    await deps.pairings.save({ ...pairing, status: "degraded", updatedAt: now() });
    const failed: GrokJob = {
      ...dispatched,
      status: "failed",
      summary: `Grok webhook returned ${posted.status}`,
      updatedAt: now(),
    };
    await deps.jobs.save(failed);
    return failed;
  }

  async function applyEvent(job: GrokJob, pairing: GrokPairing, event: EventEnvelope): Promise<void> {
    const next: GrokJob = {
      ...job,
      status: event.status,
      seqWatermark: event.seq,
      summary: event.summary,
      pendingEvents: job.pendingEvents.filter((pending) => pending.seq !== event.seq),
      updatedAt: now(),
    };
    await deps.jobs.save(next);
    await deps.projector.project(next, pairing, {
      seq: event.seq,
      status: event.status,
      summary: event.summary,
    });
    if (TERMINAL_JOB_STATUSES.has(next.status)) {
      await kickQueue(pairing.id, next.callbackBaseUrl);
    }
  }

  return {
    async requestPairing(input) {
      if (input.actorType === "guest") {
        throw new GrokBridgeError("forbidden", 403, "guests cannot create pairings");
      }
      const agentName = normalizeAgentName(input.agentName);
      if (!agentName) throw new GrokBridgeError("bad_request", 400, "agentName must be a lowercase slug");
      const existing = await deps.pairings.findActive(input.ownerPrincipalId, agentName);
      if (existing) return toPairingView(existing);
      const createdAt = now();
      const pairing = await deps.pairings.create({
        id: newId(),
        agentName,
        ownerPrincipalId: input.ownerPrincipalId,
        grokDisplayName: grokDisplayName(agentName),
        skillRevision: GROK_BRIDGE_SKILL_REVISION,
        consent: { recipientId: input.ownerPrincipalId, status: "pending" },
        status: "pending_consent",
        originScopeId: input.originScopeId || personalScope(input.ownerPrincipalId),
        createdAt,
        updatedAt: createdAt,
      });
      const winner = await deps.pairings.findActive(input.ownerPrincipalId, agentName);
      if (winner && winner.id !== pairing.id) {
        await deps.pairings.save({ ...pairing, status: "revoked", updatedAt: now() });
        return toPairingView(winner);
      }
      return toPairingView(pairing);
    },

    async decidePairing(id, ownerId, decision) {
      const pairing = await deps.pairings.get(id);
      if (!pairing) throw new GrokBridgeError("not_found", 404, "pairing not found");
      await requireOwner(pairing, ownerId);
      if (pairing.status !== "pending_consent") {
        throw new GrokBridgeError("conflict", 409, "pairing is not waiting on consent");
      }
      const decidedAt = now();
      if (decision === "decline") {
        return toPairingView(
          await deps.pairings.save({
            ...pairing,
            consent: { ...pairing.consent, status: "declined", decidedAt },
            status: "revoked",
            updatedAt: decidedAt,
          }),
        );
      }
      return toPairingView(
        await deps.pairings.save({
          ...pairing,
          consent: { ...pairing.consent, status: "accepted", decidedAt },
          status: "awaiting_inbound",
          updatedAt: decidedAt,
        }),
      );
    },

    async completeInbound(id, ownerId, inbound) {
      const pairing = await deps.pairings.get(id);
      if (!pairing) throw new GrokBridgeError("not_found", 404, "pairing not found");
      await requireOwner(pairing, ownerId);
      if (pairing.status !== "awaiting_inbound" && pairing.status !== "degraded") {
        throw new GrokBridgeError("conflict", 409, "pairing is not waiting for inbound credentials");
      }
      if (pairing.consent.status !== "accepted") {
        throw new GrokBridgeError("forbidden", 403, "owner has not accepted this pairing");
      }
      try {
        new URL(inbound.webhookUrl);
      } catch {
        throw new GrokBridgeError("bad_request", 400, "webhookUrl must be an absolute URL");
      }
      if (!inbound.webhookKey.trim()) {
        throw new GrokBridgeError("bad_request", 400, "webhookKey is required");
      }
      const inboundRef = `grok-bridge:${pairing.id}`;
      await deps.secrets.put(inboundRef, { url: inbound.webhookUrl, bearer: inbound.webhookKey.trim() });
      const updatedAt = now();
      return toPairingView(
        await deps.pairings.save({
          ...pairing,
          inboundRef,
          ...(inbound.grokBotId ? { grokBotId: inbound.grokBotId } : {}),
          status: "paired",
          updatedAt,
        }),
      );
    },

    async revoke(id, actorId) {
      const pairing = await deps.pairings.get(id);
      if (!pairing) throw new GrokBridgeError("not_found", 404, "pairing not found");
      await requireOwner(pairing, actorId);
      const updatedAt = now();
      await deps.pairings.save({ ...pairing, status: "revoked", updatedAt });
      if (pairing.inboundRef) await deps.secrets.delete(pairing.inboundRef);
      for (const job of await deps.jobs.listByPairing(pairing.id)) {
        if (!IN_FLIGHT_JOB_STATUSES.has(job.status)) continue;
        await deps.jobs.save({
          ...job,
          status: "failed",
          summary: "pairing revoked",
          callbackTokenHash: hashToken("revoked"),
          pendingEvents: [],
          updatedAt,
        });
      }
    },

    async dispatch(input) {
      if (input.actorType === "guest") {
        throw new GrokBridgeError("forbidden", 403, "guests cannot dispatch");
      }
      const agentName = normalizeAgentName(input.agentName);
      if (!agentName) throw new GrokBridgeError("bad_request", 400, "agentName must be a lowercase slug");
      const instruction = input.instruction.trim();
      if (!instruction) throw new GrokBridgeError("bad_request", 400, "instruction is required");
      if (!(await deps.sessions.canRead(input.originSessionId, input.originActorId))) {
        throw new GrokBridgeError("forbidden", 403, "you cannot read that session");
      }
      if (!(await deps.sessions.ownerIsMember(input.originSessionId, input.ownerPrincipalId))) {
        throw new GrokBridgeError("forbidden", 403, "the Grok Bot owner must be a member of the origin session");
      }
      const pairing = await deps.pairings.findActive(input.ownerPrincipalId, agentName);
      if (!pairing || pairing.status !== "paired" || pairing.consent.status !== "accepted") {
        throw new GrokBridgeError("failed_precondition", 409, "no paired Grok Bot for that agent");
      }
      const existing = await Promise.all((await deps.jobs.listByPairing(pairing.id)).map(expireIfDue));
      if (inFlightCount(existing) >= GROK_BRIDGE_QUEUE_CAP) {
        throw new GrokBridgeError("too_many_requests", 429, "pairing queue is full");
      }
      const createdAt = now();
      const ttl = Math.min(GROK_BRIDGE_DEFAULT_TTL_MS, GROK_BRIDGE_MAX_TTL_MS);
      const job = await deps.jobs.create({
        id: newId(),
        pairingId: pairing.id,
        originSessionId: input.originSessionId,
        originActorId: input.originActorId,
        instruction,
        callbackTokenHash: "",
        seqWatermark: 0,
        status: "queued",
        pendingEvents: [],
        callbackBaseUrl: input.callbackBaseUrl,
        expiresAt: createdAt + ttl,
        createdAt,
        updatedAt: createdAt,
      });
      const active = existing.some((row) => IN_FLIGHT_JOB_STATUSES.has(row.status) && row.status !== "queued");
      const started = active ? job : await sendOutbound(job, input.callbackBaseUrl);
      return toJobView(started);
    },

    async ingest(jobId, raw, authorizationHeader) {
      const job = await deps.jobs.get(jobId);
      if (!job) throw new GrokBridgeError("not_found", 404, "job not found");
      const live = await expireIfDue(job);
      const pairing = await deps.pairings.get(live.pairingId);
      if (!pairing || pairing.status === "revoked") {
        throw new GrokBridgeError("unauthorized", 401, "pairing is no longer active");
      }
      const token = parseBearer(authorizationHeader);
      if (!token || !live.callbackTokenHash || live.status === "queued") {
        throw new GrokBridgeError("unauthorized", 401, "callback token mismatch");
      }
      if (!tokenMatches(token, live.callbackTokenHash)) {
        throw new GrokBridgeError("unauthorized", 401, "callback token mismatch");
      }
      const event = parseEventEnvelope(raw, jobId);
      if (event.seq <= live.seqWatermark) return { duplicate: true };
      if (TERMINAL_JOB_STATUSES.has(live.status)) {
        throw new GrokBridgeError("conflict", 409, "job is already terminal");
      }
      if (event.seq > live.seqWatermark + 1) {
        const alreadyParked = live.pendingEvents.some((pending) => pending.seq === event.seq);
        if (alreadyParked) return { duplicate: true };
        await deps.jobs.save({
          ...live,
          pendingEvents: [...live.pendingEvents, { seq: event.seq, status: event.status, summary: event.summary }].sort(
            (a, b) => a.seq - b.seq,
          ),
          updatedAt: now(),
        });
        return { duplicate: false };
      }
      await applyEvent(live, pairing, event);
      let current = (await deps.jobs.get(jobId))!;
      for (;;) {
        const next = current.pendingEvents.find((pending) => pending.seq === current.seqWatermark + 1);
        if (!next) break;
        await applyEvent(current, pairing, {
          protocol: GROK_BRIDGE_PROTOCOL,
          job_id: jobId,
          seq: next.seq,
          status: next.status,
          summary: next.summary,
          artifacts: [],
        });
        current = (await deps.jobs.get(jobId))!;
      }
      return { duplicate: false };
    },

    async getJob(jobId, viewerId) {
      const job = await deps.jobs.get(jobId);
      if (!job) throw new GrokBridgeError("not_found", 404, "job not found");
      const live = await expireIfDue(job);
      const pairing = await deps.pairings.get(live.pairingId);
      const allowed =
        live.originActorId === viewerId ||
        pairing?.ownerPrincipalId === viewerId ||
        (await deps.sessions.canRead(live.originSessionId, viewerId));
      if (!allowed) throw new GrokBridgeError("forbidden", 403, "not a viewer of this job");
      return toJobView(live);
    },
  };
}
