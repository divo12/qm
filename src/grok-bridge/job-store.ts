import { createMemoryMap, type DurableMap } from "../persistence/durable-map.ts";
import { IN_FLIGHT_JOB_STATUSES, type GrokJob } from "./types.ts";

export interface JobStore {
  create(job: GrokJob): Promise<GrokJob>;
  get(id: string): Promise<GrokJob | null>;
  save(job: GrokJob): Promise<GrokJob>;
  listByPairing(pairingId: string): Promise<GrokJob[]>;
}

export function createJobStore(backing: DurableMap<GrokJob> = createMemoryMap<GrokJob>()): JobStore {
  return {
    async create(job) {
      await backing.put(job.id, job);
      return job;
    },
    get: (id) => backing.get(id),
    async save(job) {
      await backing.put(job.id, job);
      return job;
    },
    async listByPairing(pairingId) {
      return (await backing.all()).filter((job) => job.pairingId === pairingId);
    },
  };
}

export function inFlightCount(jobs: readonly GrokJob[]): number {
  return jobs.filter((job) => IN_FLIGHT_JOB_STATUSES.has(job.status)).length;
}

export function nextQueued(jobs: readonly GrokJob[]): GrokJob | undefined {
  return jobs.filter((job) => job.status === "queued").sort((a, b) => a.createdAt - b.createdAt)[0];
}
