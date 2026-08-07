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

/**
 * Maps a normalized device-pitch value onto the Rive `yValue`.
 *
 * The artboard's `yValue` travel runs opposite to the pitch reported by
 * `useDeviceOrientation`, so the pitch is inverted before mapping — without
 * this the graphic leans the wrong way.
 */
export function pitchToParallaxValue(pitch: number): number {
  return tiltToParallaxValue(-pitch);
}

/**
 * Fraction of the device's tilt travel treated as stillness. Below it the card
 * holds its rest pose, so the constant small movement of simply holding a phone
 * never registers. Raise it if the card looks restless in the hand.
 */
export const CARD_TILT_DEADZONE = 0.08;

/**
 * Shapes the card's response above the deadzone. `useDeviceOrientation` reports
 * a tilt already squared by its own response curve, so an exponent below 0.5
 * would overshoot linear; 0.65 lands slightly eased, close to proportional to
 * the angle the device is actually held at. Lower it for a livelier card.
 */
export const CARD_TILT_RESPONSE_EXPONENT = 0.65;

/**
 * Shapes a normalized device tilt into the value driving the card artboard.
 *
 * A single exponent cannot serve both requirements here: hand tremor must
 * produce nothing, and a small deliberate tilt must produce a lot. A power
 * curve steep enough to reject the first also flattens the second, which is why
 * the card needed a large tilt before it visibly moved. Splitting the two lets
 * each be tuned on its own — the deadzone decides what counts as still, the
 * exponent decides how the remaining travel is distributed — so a tilt a few
 * degrees past the deadzone already produces obvious motion while the card sits
 * perfectly still in the hand.
 *
 * The shared response curve is inverted first so both constants are expressed
 * in terms of how far the device has actually turned rather than in the squared
 * units the hook reports.
 */
export function shapeCardTilt(tilt: number): number {
  const travelled = Math.sqrt(Math.abs(tilt));
  if (travelled <= CARD_TILT_DEADZONE) return 0;
  const scaled = (travelled - CARD_TILT_DEADZONE) / (1 - CARD_TILT_DEADZONE);
  return Math.sign(tilt) * scaled ** CARD_TILT_RESPONSE_EXPONENT;
}
