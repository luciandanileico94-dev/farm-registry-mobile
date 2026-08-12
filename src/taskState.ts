export type TaskStatus = 'În verificare' | 'Validată';
export type TaskState = Record<string, TaskStatus>;

export type TaskAction =
  | { type: 'hydrate'; value: TaskState }
  | { type: 'validate'; id: string };

export function taskReducer(state: TaskState, action: TaskAction): TaskState {
  if (action.type === 'hydrate') return { ...state, ...action.value };
  if (state[action.id] !== undefined) return { ...state, [action.id]: 'Validată' };
  return state;
}
