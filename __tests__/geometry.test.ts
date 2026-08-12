import { describe, expect, it } from '@jest/globals';
import { formatCoordinate, polygonCentroid } from '../src/geometry';

describe('polygonCentroid', () => {
  it('calculates the centroid instead of returning a constant coordinate', () => {
    expect(polygonCentroid([[0, 0], [4, 0], [4, 2], [0, 2]])).toEqual([2, 1]);
    expect(polygonCentroid([[10, 20], [12, 20], [12, 22], [10, 22], [10, 20]])).toEqual([11, 21]);
  });

  it('formats latitude before longitude for the UI', () => {
    expect(formatCoordinate([28.84, 47.02])).toBe('47.0200, 28.8400');
  });
});
