const test = require('node:test');
const assert = require('node:assert/strict');
const { fields, fixtureTasks } = require('/tmp/farm-mobile-offline-queue-test/fixtures.js');
const { enqueueOutbox, syncOutbox } = require('/tmp/farm-mobile-offline-queue-test/offlineQueue.js');
const { filterFields, serializeMobileStore, validateObservation } = require('/tmp/farm-mobile-offline-queue-test/workspaceLogic.js');

const outboxItem = {
  clientActionId: 'observation-fixed-1', kind: 'observation', entityId: 'obs-1', fieldId: 'FR-SYN-0002',
  payload: { note: 'Observație sintetică validă', condition: 'în verificare' },
  createdAt: '2026-08-12T10:00:00.000Z', status: 'pending', attempts: 0,
};

test('outbox deduplicates the same client_action_id and supports failed retry', () => {
  const once = enqueueOutbox([], outboxItem);
  const twice = enqueueOutbox(once, { ...outboxItem });
  assert.equal(twice.length, 1);
  const failed = syncOutbox(twice, '2026-08-12T11:00:00.000Z', true);
  assert.equal(failed.queue[0].status, 'failed');
  assert.equal(failed.queue[0].attempts, 1);
});

test('work list filters by search, today and local sync', () => {
  assert.deepEqual(filterFields(fields, 'vale', 'toate', fixtureTasks, []).map((field) => field.id), ['FR-SYN-0003', 'FR-SYN-0004']);
  assert.ok(filterFields(fields, '', 'azi', fixtureTasks, []).length >= 6);
  assert.deepEqual(filterFields(fields, '', 'sync', fixtureTasks, [outboxItem]).map((field) => field.id), ['FR-SYN-0002']);
});

test('observation validation rejects short or incomplete input', () => {
  assert.equal(validateObservation('scurt', 'validat'), 'Nota trebuie să aibă cel puțin 10 caractere.');
  assert.equal(validateObservation('O observație suficient de lungă', ''), 'Alege condiția observată înainte de salvare.');
  assert.equal(validateObservation('O observație suficient de lungă', 'validat'), undefined);
});

test('mobile store serialization preserves the offline outbox for persistence', () => {
  const serialized = serializeMobileStore({ tasks: fixtureTasks, observations: [], outbox: [outboxItem], audit: [] });
  const restored = JSON.parse(serialized);
  assert.equal(restored.outbox[0].clientActionId, outboxItem.clientActionId);
  assert.equal(restored.tasks.length, fixtureTasks.length);
});
