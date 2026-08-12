export type Coordinate = readonly [longitude: number, latitude: number];

/** Centroid for a simple polygon using the planar shoelace formula. */
export function polygonCentroid(ring: readonly Coordinate[]): Coordinate {
  const points = ring.length > 1 && sameCoordinate(ring[0], ring[ring.length - 1])
    ? ring.slice(0, -1)
    : ring;

  if (points.length < 3) {
    throw new Error('A polygon needs at least three distinct points');
  }

  let areaTwice = 0;
  let longitude = 0;
  let latitude = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const cross = current[0] * next[1] - next[0] * current[1];
    areaTwice += cross;
    longitude += (current[0] + next[0]) * cross;
    latitude += (current[1] + next[1]) * cross;
  }

  if (Math.abs(areaTwice) < Number.EPSILON) {
    throw new Error('A polygon cannot have zero area');
  }
  return [longitude / (3 * areaTwice), latitude / (3 * areaTwice)];
}

function sameCoordinate(first: Coordinate, second: Coordinate): boolean {
  return first[0] === second[0] && first[1] === second[1];
}

export function formatCoordinate(coordinate: Coordinate): string {
  return `${coordinate[1].toFixed(4)}, ${coordinate[0].toFixed(4)}`;
}
