import {
  PARALLAX_REST_VALUE,
  PARALLAX_TILT_AMPLITUDE,
  pitchToParallaxValue,
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

describe('pitchToParallaxValue', () => {
  it('maps a device at its neutral pitch to the resting (centred) value', () => {
    expect(pitchToParallaxValue(0)).toBe(PARALLAX_REST_VALUE);
  });

  it('maps full positive pitch to rest - amplitude', () => {
    expect(pitchToParallaxValue(1)).toBe(
      PARALLAX_REST_VALUE - PARALLAX_TILT_AMPLITUDE,
    );
  });

  it('maps full negative pitch to rest + amplitude', () => {
    expect(pitchToParallaxValue(-1)).toBe(
      PARALLAX_REST_VALUE + PARALLAX_TILT_AMPLITUDE,
    );
  });

  it('maps a partial pitch to the opposite side of the resting value', () => {
    expect(pitchToParallaxValue(0.5)).toBe(25);
    expect(pitchToParallaxValue(-0.5)).toBe(75);
  });

  it('clamps values beyond the normalized range', () => {
    expect(pitchToParallaxValue(2)).toBe(
      PARALLAX_REST_VALUE - PARALLAX_TILT_AMPLITUDE,
    );
    expect(pitchToParallaxValue(-2)).toBe(
      PARALLAX_REST_VALUE + PARALLAX_TILT_AMPLITUDE,
    );
  });

  it.each([-2, -1, -0.5, -0.25, 0, 0.25, 0.5, 1, 2])(
    'inverts tiltToParallaxValue for a pitch of %s',
    (pitch) => {
      expect(pitchToParallaxValue(pitch)).toBe(tiltToParallaxValue(-pitch));
    },
  );
});
