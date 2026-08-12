import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { taskReducer } from '../src/taskState';

describe('taskReducer', () => {
  it('validates an existing local task and ignores unknown ids', () => {
    const state = { 'MD-CT-00142': 'În verificare' as const };
    assert.deepEqual(taskReducer(state, { type: 'validate', id: 'MD-CT-00142' }), { 'MD-CT-00142': 'Validată' });
    assert.deepEqual(taskReducer(state, { type: 'validate', id: 'missing' }), state);
  });

  it('hydrates persisted task status without dropping current tasks', () => {
    assert.deepEqual(taskReducer({ a: 'În verificare' }, { type: 'hydrate', value: { b: 'Validată' } }), {
      a: 'În verificare', b: 'Validată',
    });
  });
});
