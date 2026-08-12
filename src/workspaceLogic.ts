import { farmById, type Field, type FieldStatus, type MobileStore, type Task } from './fixtures';
import type { OutboxItem } from './offlineQueue';

export type WorkFilter = 'toate' | 'azi' | 'actiune' | 'sync';

export const validateObservation = (note: string, condition: FieldStatus | ''): string | undefined => {
  if (note.trim().length < 10) return 'Nota trebuie să aibă cel puțin 10 caractere.';
  if (!condition) return 'Alege condiția observată înainte de salvare.';
  return undefined;
};

export const filterFields = (
  allFields: Field[],
  query: string,
  filter: WorkFilter,
  tasks: Task[],
  outbox: OutboxItem[],
): Field[] => {
  const normalized = query.trim().toLowerCase();
  return allFields.filter((field) => {
    const fieldTasks = tasks.filter((task) => task.fieldId === field.id);
    const matchesQuery = !normalized || `${field.id} ${field.name} ${field.crop} ${farmById(field.farmId)?.name ?? ''}`.toLowerCase().includes(normalized);
    const matchesFilter = filter === 'toate'
      || (filter === 'azi' && fieldTasks.some((task) => task.state !== 'finalizat' && task.dueDate === '2026-08-12'))
      || (filter === 'actiune' && field.status === 'necesită acțiune')
      || (filter === 'sync' && outbox.some((item) => item.fieldId === field.id && item.status !== 'synced'));
    return matchesQuery && matchesFilter;
  });
};

export const serializeMobileStore = (store: MobileStore): string => JSON.stringify(store);
