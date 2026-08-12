export type ValidationAction = {
  id: string;
  parcelId: string;
  parcelName: string;
  createdAt: string;
};

export type DemoHistoryItem = ValidationAction & { syncedAt: string };

/** The legacy validation queue is kept for backwards-compatible tests. */
export type DemoStore = {
  queue: ValidationAction[];
  history: DemoHistoryItem[];
};

export const emptyDemoStore: DemoStore = { queue: [], history: [] };

export function enqueueValidation(queue: ValidationAction[], action: ValidationAction) {
  return [...queue, action];
}

export function flushValidationQueue(queue: ValidationAction[], flushedAt: string) {
  return {
    queue: [] as ValidationAction[],
    history: queue.map((action) => ({ ...action, syncedAt: flushedAt })),
  };
}

export type SyncStatus = 'draft' | 'pending' | 'synced' | 'failed';
export type OutboxKind = 'observation' | 'task_update' | 'task_create';

export type OutboxItem = {
  clientActionId: string;
  kind: OutboxKind;
  entityId: string;
  fieldId: string;
  payload: Record<string, string | number | boolean | undefined>;
  createdAt: string;
  status: Exclude<SyncStatus, 'draft'>;
  attempts: number;
  lastError?: string;
};

export const enqueueOutbox = (queue: OutboxItem[], item: OutboxItem): OutboxItem[] => {
  if (queue.some((queued) => queued.clientActionId === item.clientActionId)) return queue;
  return [...queue, item];
};

export const retryFailedOutbox = (queue: OutboxItem[]): OutboxItem[] =>
  queue.map((item) => item.status === 'failed'
    ? { ...item, status: 'pending', lastError: undefined }
    : item);

export const syncOutbox = (
  queue: OutboxItem[],
  syncedAt: string,
  forceFailure = false,
): { queue: OutboxItem[]; synced: OutboxItem[]; failed: OutboxItem[] } => {
  const synced: OutboxItem[] = [];
  const failed: OutboxItem[] = [];
  const nextQueue = queue.map((item) => {
    if (item.status !== 'pending') return item;
    if (forceFailure) {
      const failedItem = { ...item, status: 'failed' as const, attempts: item.attempts + 1, lastError: 'Eșec simulat local pentru demonstrație.' };
      failed.push(failedItem);
      return failedItem;
    }
    const syncedItem = { ...item, status: 'synced' as const, attempts: item.attempts + 1, lastError: undefined };
    synced.push(syncedItem);
    return syncedItem;
  });
  // Keep the timestamp in the function contract explicit: the local adapter never
  // contacts a server, but callers can use this value for their audit entry.
  void syncedAt;
  return { queue: nextQueue, synced, failed };
};

export const pendingOutboxCount = (queue: OutboxItem[]) =>
  queue.filter((item) => item.status === 'pending' || item.status === 'failed').length;
