/**
 * Rive `xValue` / `yValue` (view model "Main") drive the parallax layers.
 * The authored resting value is 50 (centred); the `x0`/`x100`/`y0`/`y100`
 * timelines map 0 → one extreme and 100 → the other.
 */
export const PARALLAX_REST_VALUE = 50;

/** Travel from the resting value at full device tilt. 50 → design-native 0..100. */
export const PARALLAX_TILT_AMPLITUDE = 50;

/**
 * Maps a normalized device-tilt value (from `useDeviceOrientation`, in the
 * [-1, 1] range) onto the Rive value, swinging symmetrically around the resting
 * value.
 *
 * A flat device (tilt 0) yields the rest value (centred); full tilt yields
 * `rest ± PARALLAX_TILT_AMPLITUDE`. The input is clamped so a sensor spike can
 * never push a layer past its intended travel.
 */
export function tiltToParallaxValue(tilt: number): number {
  const clamped = Math.min(1, Math.max(-1, tilt));
  return PARALLAX_REST_VALUE + clamped * PARALLAX_TILT_AMPLITUDE;
}
