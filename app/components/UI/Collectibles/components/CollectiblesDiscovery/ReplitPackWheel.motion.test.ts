import {
  REPLIT_WHEEL,
  wheelGestureTarget,
  wheelOpacity,
  wheelRelativeDistance,
  wheelRotation,
  wheelScale,
} from './ReplitPackWheel.motion';

describe('Replit HomePackSpinner motion parity', () => {
  it('preserves the authored spring and timing constants', () => {
    const parameters = REPLIT_WHEEL;

    expect(parameters).toMatchObject({
      slotRatio: 0.62,
      stiffness: 380,
      damping: 42,
      restDelta: 0.001,
      projection: 0.18,
      perspective: 800,
    });
  });

  it('matches PackCard center and immediate-neighbor transforms', () => {
    const transforms = [-1, 0, 1].map((distance) => [
      wheelScale(distance),
      wheelOpacity(distance),
      wheelRotation(distance),
    ]);

    expect(transforms).toEqual([
      [0.88, 0.92, '28deg'],
      [1, 1, '0deg'],
      [0.88, 0.92, '-28deg'],
    ]);
  });

  it('wraps to the nearest carousel neighbor across the boundary', () => {
    const distance = wheelRelativeDistance(0, 7, 8);

    expect(distance).toBe(1);
  });

  it('caps a high-velocity gesture to one offering as in Replit', () => {
    const target = wheelGestureTarget(2, 2.4, 25);

    expect(target).toBe(3);
  });
});
