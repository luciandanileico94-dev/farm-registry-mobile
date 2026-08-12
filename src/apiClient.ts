import type { Field, Observation, Task } from './fixtures';

export type FarmRegistryApi = {
  getFields(): Promise<Field[]>;
  getTasks(fieldId?: string): Promise<Task[]>;
  postObservation(observation: Observation): Promise<Observation>;
};

export const getConfiguredApiBaseUrl = (): string | undefined => {
  const environment = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const value = environment?.EXPO_PUBLIC_FARM_REGISTRY_API_URL?.trim();
  return value || undefined;
};

const request = async <T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, init);
  if (!response.ok) throw new Error(`API ${response.status}: ${response.statusText}`);
  return response.json() as Promise<T>;
};

/** Optional future FastAPI boundary. Local fixtures remain the default mode. */
export const createApiClient = (baseUrl = getConfiguredApiBaseUrl()): FarmRegistryApi | undefined => {
  if (!baseUrl) return undefined;
  return {
    getFields: () => request<Field[]>(baseUrl, '/fields'),
    getTasks: (fieldId) => request<Task[]>(baseUrl, fieldId ? `/tasks?field_id=${encodeURIComponent(fieldId)}` : '/tasks'),
    postObservation: (observation) => request<Observation>(baseUrl, '/observations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(observation),
    }),
  };
};
