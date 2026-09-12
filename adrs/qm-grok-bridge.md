# ADR: Grok Bot as a personal execution backend, not a team surface

QM is the multiplayer product. Grok Bot stays individual-native: one Firecracker
computer per Cursor user, shared by that user's Bots. This ADR adds a bridge so a
named QM agent (Sara) can send work to a paired Grok Bot on a consenting owner's
computer and receive a typed result back into the originating QM session.

It does not make Grok Bot team-owned. Sharing a Bot copies a profile; it does not
share the computer. Puppeteering the Grok Bot GUI as the chat bus is rejected.

## Decision

1. **QM remains the room.** Humans talk in Slack or the web UI. Results render
   there, labeled with the owning person and the paired Bot name.
2. **Grok Bot remains the personal computer.** Logins, cookies, files, and Auto
   Review stay on that Cursor user. The bridge never pretends those are a security
   boundary between Bots on the same account.
3. **The data plane is `qm-grok-bridge/v1` over HTTP.** QM dispatches a job
   envelope to the owner's Grok Bot webhook routine. The Bot POSTs events to a
   job-scoped QM callback. A Grok Bot `200` means accepted, not done.
4. **Computer use is the control plane, not the messenger.** A provisioner
   (manual paste first, CUA later) creates or finds `QM · {name}` on the owner's
   Grok Bot.app, installs the reply skill, and stores the inbound webhook in the
   keychain. After pairing, CUA is recovery only.
5. **Reuse QM primitives.** Pairing consent is the same shape as
   `[[ask-agent]]` / `RecipientConsent`. Secrets live in the keychain. Inbound
   events are verified like webhooks, idempotent like deliveries, and
   security-screened before they hit a transcript. One in-flight job per pairing.

## Why not the alternatives

- **CUA types every message into Grok Bot.app.** Serial, fragile, fights the
  owner for the composer, and still has no structured completion signal.
- **Chat-embedded JSON that QM parses from the Grok Bot thread.** Models drift;
  scraping is the same rot plus UI churn.
- **Undocumented Grok Bot `:1340 sendPrompt`.** Not a contract. Do not ship on it.
- **Team-owned Grok Bot computer.** That is a Cursor/xAI product change. QM
  cannot overlay membership onto a per-user microVM.

## Scope

In: pairing, job dispatch, event ingest, session projection, owner consent,
feature flag `grok_bridge`, protocol v1.

Out: changing Grok Bot itself; auto-clicking Grok Bot Allow; org-wide tokens on
the owner's computer; using display name as the stable id after first bind.

The full design is [docs/grok-bridge.md](../docs/grok-bridge.md).
