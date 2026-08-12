import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { formatCoordinate, polygonCentroid } from '../src/geometry';

describe('polygonCentroid', () => {
  it('calculates the centroid instead of returning a constant coordinate', () => {
    assert.deepEqual(polygonCentroid([[0, 0], [4, 0], [4, 2], [0, 2]]), [2, 1]);
    assert.deepEqual(polygonCentroid([[10, 20], [12, 20], [12, 22], [10, 22], [10, 20]]), [11, 21]);
  });

  it('formats latitude before longitude for the UI', () => {
    assert.equal(formatCoordinate([28.84, 47.02]), '47.0200, 28.8400');
  });
});
