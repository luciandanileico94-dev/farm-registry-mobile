import { describe, expect, it } from '@jest/globals';
import { taskReducer } from '../src/taskState';

describe('taskReducer', () => {
  it('validates an existing local task and ignores unknown ids', () => {
    const state = { 'SYNTH-CT-00142': 'În verificare' as const };
    expect(taskReducer(state, { type: 'validate', id: 'SYNTH-CT-00142' })).toEqual({ 'SYNTH-CT-00142': 'Validată' });
    expect(taskReducer(state, { type: 'validate', id: 'missing' })).toEqual(state);
  });

  it('hydrates persisted task status without dropping current tasks', () => {
    expect(taskReducer({ a: 'În verificare' }, { type: 'hydrate', value: { b: 'Validată' } })).toEqual({
      a: 'În verificare', b: 'Validată',
    });
  });
});
