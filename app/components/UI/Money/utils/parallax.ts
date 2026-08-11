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
 * Smallest change in a Rive value worth dispatching, in the artboard's own
 * 0-100 units. The artboards spread that range over a few tens of pixels of
 * travel, so a quarter of a unit is well under a tenth of a pixel — below what
 * a display can resolve, and far below what a hand can aim at.
 */
export const RIVE_TILT_WRITE_EPSILON = 0.25;

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
 * Fraction of the device's tilt travel the parallax graphic treats as
 * stillness. The graphic is large and sits behind text, so it is read as
 * unstable sooner than the card thumbnail is; it gets a wider deadzone.
 */
export const PARALLAX_TILT_DEADZONE = 0.1;

/**
 * Shapes the parallax response above the noise floor. Squaring restores the
 * curve `useDeviceOrientation` already applies, so the graphic keeps the reach
 * it has today and only gains the stillness — unlike the card, nothing here
 * asked for more travel.
 */
export const PARALLAX_RESPONSE_EXPONENT = 2;

/**
 * Weight given to each new sample when easing the graphic towards it. Lower is
 * calmer but laggier. This is a second stage on top of the hook's own low-pass:
 * a deadzone alone still lets the graphic step as readings cross its edge, and
 * the roll correction multiplies sensor noise at the steep holding angles the
 * Money home screen is read at.
 *
 * Expressed at `PARALLAX_SMOOTHING_REFERENCE_HZ`; see `parallaxSmoothingFactor`.
 */
export const PARALLAX_SMOOTHING = 0.25;

/**
 * Sample rate `PARALLAX_SMOOTHING` is expressed at, matching the hook's default.
 */
export const PARALLAX_SMOOTHING_REFERENCE_HZ = 60;

/**
 * Shapes a normalized device tilt by re-basing it on the deadzone edge and
 * redistributing the travel that remains.
 *
 * A single exponent cannot serve both requirements here: hand tremor must
 * produce nothing, and a deliberate tilt must produce something. A power curve
 * steep enough to reject the first also flattens the second. Splitting the two
 * lets each be tuned on its own — the deadzone decides what counts as still,
 * the exponent decides how the remaining travel is distributed.
 *
 * The hook's response curve is inverted first so both parameters are expressed
 * in terms of how far the device has actually turned rather than in the squared
 * units the hook reports.
 *
 * Because the deadzone is subtracted *before* the exponent, the exponent bends
 * the whole curve rather than just the region above the deadzone. That is what
 * the card wants — its exponent is below 1, so re-basing turns the remaining
 * travel into the boost MUSD-1249 tuned by hand. A surface that wants to keep
 * its reach unchanged wants `shapeTiltAboveNoiseFloor` instead.
 */
export function shapeTilt(
  tilt: number,
  deadzone: number,
  exponent: number,
): number {
  const travelled = Math.sqrt(Math.abs(tilt));
  if (travelled <= deadzone) return 0;
  const scaled = (travelled - deadzone) / (1 - deadzone);
  return Math.sign(tilt) * scaled ** exponent;
}

/**
 * Shapes a normalized device tilt by applying the exponent first and then
 * subtracting the deadzone as a noise floor in the shaped units.
 *
 * A deadzone and a response exponent do not commute. `shapeTilt` subtracts
 * first, so squaring a shifted value shrinks the entire low end rather than
 * only the dead band — at the few degrees a phone moves while its screen is
 * being read, that removes almost all of the motion. Subtracting afterwards
 * removes the noise floor and leaves the curve above it as authored, which is
 * what a surface asking only for stillness means by a deadzone.
 */
export function shapeTiltAboveNoiseFloor(
  tilt: number,
  deadzone: number,
  exponent: number,
): number {
  const travelled = Math.sqrt(Math.abs(tilt));
  if (travelled <= deadzone) return 0;
  const noiseFloor = deadzone ** exponent;
  return (
    Math.sign(tilt) * ((travelled ** exponent - noiseFloor) / (1 - noiseFloor))
  );
}

/**
 * Shapes a normalized device tilt into the value driving the card artboard.
 *
 * The card needed a large tilt before it visibly moved, so its exponent eases
 * the response to close to proportional with the angle the device is held at.
 */
export function shapeCardTilt(tilt: number): number {
  return shapeTilt(tilt, CARD_TILT_DEADZONE, CARD_TILT_RESPONSE_EXPONENT);
}

/**
 * Shapes a normalized device tilt into the value driving the Next Best Action
 * parallax artboard.
 *
 * The graphic asked for stillness, not for a different reach, so its deadzone
 * is a noise floor: below it the artboard holds its rest pose, above it the
 * response is the one the hook already produces.
 */
export function shapeParallaxTilt(tilt: number): number {
  return shapeTiltAboveNoiseFloor(
    tilt,
    PARALLAX_TILT_DEADZONE,
    PARALLAX_RESPONSE_EXPONENT,
  );
}

/**
 * Per-sample weight that settles in the same wall-clock time at any sample
 * rate, derived from `PARALLAX_SMOOTHING` at the reference rate.
 *
 * Neither this stage nor the hook's own low-pass is inherently rate-aware, so a
 * fixed weight settles in twice the time on the low-end 30Hz path — long enough
 * that a deliberate tilt reads as lag rather than as motion.
 */
export function parallaxSmoothingFactor(hz: number): number {
  if (!Number.isFinite(hz) || hz <= 0) return PARALLAX_SMOOTHING;
  return 1 - (1 - PARALLAX_SMOOTHING) ** (PARALLAX_SMOOTHING_REFERENCE_HZ / hz);
}

/**
 * Eases a parallax value towards the one just measured, at the rate the sensor
 * is currently being sampled at.
 *
 * Applied after shaping rather than before, so the jump out of the noise floor
 * is smoothed too — a hard edge there would itself read as a flick.
 */
export function smoothParallaxTilt(
  previous: number,
  next: number,
  hz: number,
): number {
  return previous + parallaxSmoothingFactor(hz) * (next - previous);
}
