export type ValidationAction = {
  id: string;
  parcelId: string;
  parcelName: string;
  createdAt: string;
};

export type DemoHistoryItem = ValidationAction & { syncedAt: string };

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
