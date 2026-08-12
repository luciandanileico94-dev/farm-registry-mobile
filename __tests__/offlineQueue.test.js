const test = require('node:test');
const assert = require('node:assert/strict');
const { enqueueValidation, flushValidationQueue } = require('/tmp/farm-mobile-offline-queue-test/offlineQueue.js');
const fs = require('node:fs');

const action = { id: 'a1', parcelId: 'MD-CT-00142', parcelName: 'AgroNord SRL', createdAt: '2026-08-12T10:00:00.000Z' };

test('enqueue keeps a local validation in the queue', () => {
  const queue = enqueueValidation([], action);
  assert.deepEqual(queue, [action]);
  assert.deepEqual(enqueueValidation(queue, { ...action, id: 'a2' }).map((item) => item.id), ['a1', 'a2']);
});

test('flush moves every queued validation into local history', () => {
  const result = flushValidationQueue([action], '2026-08-12T11:00:00.000Z');
  assert.deepEqual(result.queue, []);
  assert.equal(result.history[0].parcelId, action.parcelId);
  assert.equal(result.history[0].syncedAt, '2026-08-12T11:00:00.000Z');
});

test('sync notice uses Romanian singular and plural grammar', () => {
  const appSource = fs.readFileSync('/work/repo/App.tsx', 'utf8');
  assert.match(appSource, /count === 1 \? 'validare a fost mutată' : 'validări au fost mutate'/);
  assert.match(appSource, /setNotice\(formatSyncNotice\(flushed\.history\.length\)\)/);
});
