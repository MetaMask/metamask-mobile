import {
  PARALLAX_REST_VALUE,
  PARALLAX_TILT_AMPLITUDE,
  tiltToParallaxValue,
} from './parallax';

describe('tiltToParallaxValue', () => {
  it('maps a flat device to the resting (centred) value', () => {
    expect(tiltToParallaxValue(0)).toBe(PARALLAX_REST_VALUE);
  });

  it('maps full positive tilt to rest + amplitude', () => {
    expect(tiltToParallaxValue(1)).toBe(
      PARALLAX_REST_VALUE + PARALLAX_TILT_AMPLITUDE,
    );
  });

  it('maps full negative tilt to rest - amplitude', () => {
    expect(tiltToParallaxValue(-1)).toBe(
      PARALLAX_REST_VALUE - PARALLAX_TILT_AMPLITUDE,
    );
  });

  it('maps a partial tilt linearly around the resting value', () => {
    expect(tiltToParallaxValue(0.5)).toBe(75);
    expect(tiltToParallaxValue(-0.5)).toBe(25);
  });

  it('clamps values beyond the normalized range', () => {
    expect(tiltToParallaxValue(2)).toBe(
      PARALLAX_REST_VALUE + PARALLAX_TILT_AMPLITUDE,
    );
    expect(tiltToParallaxValue(-2)).toBe(
      PARALLAX_REST_VALUE - PARALLAX_TILT_AMPLITUDE,
    );
  });
});
