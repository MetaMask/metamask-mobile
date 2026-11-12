/**
 * Design source: Gacha-North-Star/artifacts/figma-design/src/components/gacha/
 * HomePackSpinner.tsx, PackCard.tsx, homePackOfferings.ts; src/index.css .gx-float.
 * Values and equations are copied from that authored implementation, not a new animation.
 */
export const REPLIT_WHEEL = {
  slotRatio: 0.62,
  stiffness: 380,
  damping: 42,
  restDelta: 0.001,
  projection: 0.18,
  perspective: 800,
};
export const wrapWheelIndex = (value: number, count: number) =>
  ((value % count) + count) % count;
export const wheelRelativeDistance = (
  index: number,
  progress: number,
  count: number,
) => {
  const delta = wrapWheelIndex(index - progress, count);
  return delta > count / 2 ? delta - count : delta;
};
export const wheelScale = (distance: number) =>
  1 - 0.12 * Math.min(Math.abs(distance), 1);
export const wheelOpacity = (distance: number) =>
  Math.max(
    0,
    1 - 0.08 * Math.abs(distance) - (Math.abs(distance) > 1.6 ? 1 : 0),
  );
export const wheelRotation = (distance: number) =>
  `${-28 * Math.max(-1, Math.min(1, distance))}deg`;
export const wheelGestureTarget = (
  origin: number,
  current: number,
  velocity: number,
) =>
  Math.max(
    Math.round(origin) - 1,
    Math.min(
      Math.round(origin) + 1,
      Math.round(current + velocity * REPLIT_WHEEL.projection),
    ),
  );
