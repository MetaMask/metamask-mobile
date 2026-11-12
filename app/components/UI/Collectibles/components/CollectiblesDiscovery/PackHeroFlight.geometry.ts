/** Source: Replit packHandoffGeometry.ts + PackHeroFlight.tsx (native viewport units). */
export interface PackHeroRect {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface PackHeroSource {
  packCode: string;
  rect: PackHeroRect;
  transform: string;
  time: number;
}
export const PACK_HERO_FLIGHT = {
  duration: 240,
  easing: [0.2, 0.8, 0.2, 1] as const,
};
export const packFlightTransform = (from: PackHeroRect, to: PackHeroRect) => ({
  translateX: to.left - from.left,
  translateY: to.top - from.top,
  scaleX: to.width / from.width,
  scaleY: to.height / from.height,
});

/** CSS DOMMatrix(a,b,c,d,e,f) in React Native's column-major 4×4 format. */
export function packFloatMatrix(transform: string) {
  const matrix3d = /^matrix3d\(([^)]+)\)$/u
    .exec(transform)?.[1]
    .split(',')
    .map(Number);
  if (matrix3d?.length === 16 && matrix3d.every(Number.isFinite)) {
    return [
      matrix3d[0],
      matrix3d[1],
      matrix3d[2],
      matrix3d[3],
      matrix3d[4],
      matrix3d[5],
      matrix3d[6],
      matrix3d[7],
      matrix3d[8],
      matrix3d[9],
      matrix3d[10],
      matrix3d[11],
      matrix3d[12],
      matrix3d[13],
      matrix3d[14],
      matrix3d[15],
    ] as const;
  }
  const match = /^matrix\(([^)]+)\)$/u.exec(transform);
  const values = match?.[1].split(',').map(Number);
  if (
    !values ||
    values.length !== 6 ||
    values.some((value) => !Number.isFinite(value))
  )
    return undefined;
  const [a, b, c, d, e, f] = values;
  return [a, b, 0, 0, c, d, 0, 0, 0, 0, 1, 0, e, f, 0, 1] as const;
}
