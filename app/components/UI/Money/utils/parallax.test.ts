import {
  PARALLAX_REST_VALUE,
  PARALLAX_SMOOTHING,
  PARALLAX_TILT_DEADZONE,
  shapeCardTilt,
  shapeParallaxTilt,
  smoothParallaxTilt,
  CARD_TILT_DEADZONE,
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

describe('shapeCardTilt', () => {
  it('holds the rest pose for a device that is still', () => {
    expect(shapeCardTilt(0)).toBe(0);
  });

  it('holds the rest pose for movement inside the deadzone', () => {
    // Squared, because the hook reports an already-curved tilt.
    const insideDeadzone = (CARD_TILT_DEADZONE / 2) ** 2;

    expect(shapeCardTilt(insideDeadzone)).toBe(0);
    expect(shapeCardTilt(-insideDeadzone)).toBe(0);
  });

  it('preserves full travel at the extremes', () => {
    expect(shapeCardTilt(1)).toBeCloseTo(1, 10);
    expect(shapeCardTilt(-1)).toBeCloseTo(-1, 10);
  });

  it('preserves the direction of the tilt', () => {
    expect(shapeCardTilt(-0.25)).toBeCloseTo(-shapeCardTilt(0.25), 10);
  });

  it('responds to a small deliberate tilt far more than the raw curve would', () => {
    // A third of the way through the travel, as reported by the hook.
    const smallTilt = (1 / 3) ** 2;

    expect(shapeCardTilt(smallTilt)).toBeGreaterThan(smallTilt * 3);
  });

  it('increases monotonically with the tilt', () => {
    const samples = [0.05, 0.15, 0.3, 0.5, 0.75, 1].map(shapeCardTilt);

    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThan(samples[i - 1]);
    }
  });
});

describe('shapeParallaxTilt', () => {
  it('holds the graphic at rest for a device that is still', () => {
    expect(shapeParallaxTilt(0)).toBe(0);
  });

  it('holds the graphic at rest for movement inside the deadzone', () => {
    // Squared, because the hook reports an already-curved tilt.
    const insideDeadzone = (PARALLAX_TILT_DEADZONE / 2) ** 2;

    expect(shapeParallaxTilt(insideDeadzone)).toBe(0);
    expect(shapeParallaxTilt(-insideDeadzone)).toBe(0);
  });

  it('preserves full travel at the extremes', () => {
    expect(shapeParallaxTilt(1)).toBeCloseTo(1, 10);
    expect(shapeParallaxTilt(-1)).toBeCloseTo(-1, 10);
  });

  it('preserves the direction of the tilt', () => {
    expect(shapeParallaxTilt(-0.25)).toBeCloseTo(-shapeParallaxTilt(0.25), 10);
  });

  it('increases monotonically with the tilt', () => {
    const samples = [0.05, 0.15, 0.3, 0.5, 0.75, 1].map(shapeParallaxTilt);

    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThan(samples[i - 1]);
    }
  });

  it('damps rather than boosts, unlike the card curve', () => {
    const midTilt = 0.5 ** 2;

    expect(shapeParallaxTilt(midTilt)).toBeLessThan(midTilt);
    expect(shapeParallaxTilt(midTilt)).toBeLessThan(shapeCardTilt(midTilt));
  });

  it('rejects a jitter the raw curve would still pass through', () => {
    // Roughly a degree of tremor, amplified by the roll correction.
    const tremor = (PARALLAX_TILT_DEADZONE * 0.9) ** 2;

    expect(tremor).toBeGreaterThan(0);
    expect(shapeParallaxTilt(tremor)).toBe(0);
  });
});

describe('smoothParallaxTilt', () => {
  it('stays put when the reading has not changed', () => {
    expect(smoothParallaxTilt(0.4, 0.4)).toBeCloseTo(0.4, 10);
  });

  it('moves only part of the way towards a new reading', () => {
    expect(smoothParallaxTilt(0, 1)).toBeCloseTo(PARALLAX_SMOOTHING, 10);
  });

  it('never lets a single-sample spike through at full amplitude', () => {
    expect(smoothParallaxTilt(0, 1)).toBeLessThan(0.5);
  });

  it('decays a single-sample spike back towards rest', () => {
    let value = smoothParallaxTilt(0, 1);
    for (let i = 0; i < 10; i++) {
      value = smoothParallaxTilt(value, 0);
    }

    expect(Math.abs(value)).toBeLessThan(0.05);
  });

  it('converges on a sustained reading', () => {
    let value = 0;
    for (let i = 0; i < 60; i++) {
      value = smoothParallaxTilt(value, 1);
    }

    expect(value).toBeCloseTo(1, 3);
  });

  it('eases symmetrically in both directions', () => {
    expect(smoothParallaxTilt(0, -1)).toBeCloseTo(
      -smoothParallaxTilt(0, 1),
      10,
    );
  });
});
