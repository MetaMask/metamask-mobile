import {
  advanceMarquee,
  DISPERSE,
  getDisperseMotion,
  getReassembleDelay,
  isPillOnScreen,
  ON_SCREEN_MARGIN,
  REASSEMBLE,
  stepMarqueeSpeed,
  wrapOffset,
} from './hotTokenRailMotion';

describe('hotTokenRailMotion', () => {
  describe('wrapOffset', () => {
    it('keeps an offset inside the track', () => {
      expect(wrapOffset(250, 200)).toBe(50);
    });

    it('wraps a negative offset to the end of the track', () => {
      expect(wrapOffset(-50, 200)).toBe(150);
    });

    it('returns 0 before the track is measured', () => {
      expect(wrapOffset(50, 0)).toBe(0);
    });
  });

  describe('stepMarqueeSpeed', () => {
    it('accelerates toward the target', () => {
      const next = stepMarqueeSpeed(0, 24, 0.016);

      expect(next).toBeGreaterThan(0);
      expect(next).toBeLessThan(24);
    });

    it('brakes faster than it accelerates', () => {
      const braked = 24 - stepMarqueeSpeed(24, 0, 0.016);
      const accelerated = stepMarqueeSpeed(0, 24, 0.016);

      expect(braked).toBeGreaterThan(accelerated);
    });

    it('stops once a braking marquee is nearly still', () => {
      expect(stepMarqueeSpeed(0.05, 0, 0.016)).toBe(0);
    });
  });

  describe('advanceMarquee', () => {
    it('holds a track that fits the viewport', () => {
      expect(advanceMarquee(10, 24, 24, 16, 300, 400)).toEqual({
        offset: 10,
        speed: 24,
      });
    });

    it('holds when no time has passed', () => {
      expect(advanceMarquee(10, 24, 24, 0, 800, 400)).toEqual({
        offset: 10,
        speed: 24,
      });
    });

    it('moves the offset by the eased speed', () => {
      const next = advanceMarquee(10, 24, 24, 1000 / 60, 800, 400);

      expect(next.speed).toBe(24);
      expect(next.offset).toBeCloseTo(10 + 24 / 60);
    });

    it('caps a long frame so a stall does not jump the rail', () => {
      const next = advanceMarquee(0, 24, 24, 1000, 800, 400);

      expect(next.offset).toBeCloseTo(24 * 0.05);
    });

    it('wraps past the end of the track', () => {
      const next = advanceMarquee(799.9, 24, 24, 16, 800, 400);

      expect(next.offset).toBeLessThan(1);
    });
  });

  describe('isPillOnScreen', () => {
    it('counts a pill inside the viewport', () => {
      expect(isPillOnScreen(100, 80, 400)).toBe(true);
    });

    it('counts a pill just past either edge', () => {
      expect(isPillOnScreen(-100, 80, 400)).toBe(true);
      expect(isPillOnScreen(400 + ON_SCREEN_MARGIN - 1, 80, 400)).toBe(true);
    });

    it('skips a pill well past either edge', () => {
      expect(isPillOnScreen(-200, 80, 400)).toBe(false);
      expect(isPillOnScreen(400 + ON_SCREEN_MARGIN, 80, 400)).toBe(false);
    });
  });

  describe('getDisperseMotion', () => {
    it('sends pills right of the pressed pill to the right', () => {
      expect(getDisperseMotion(300, 100)).toEqual({
        delay: 200 * DISPERSE.delayPerPixel,
        shiftX: DISPERSE.shiftX,
      });
    });

    it('sends pills left of the pressed pill to the left', () => {
      expect(getDisperseMotion(50, 100).shiftX).toBe(-DISPERSE.shiftX);
    });

    it('caps the delay for far pills', () => {
      expect(getDisperseMotion(5000, 0).delay).toBe(DISPERSE.maxDelay);
    });
  });

  describe('getReassembleDelay', () => {
    it('grows across the viewport', () => {
      expect(getReassembleDelay(200, 400)).toBe(
        REASSEMBLE.baseDelay + 0.5 * REASSEMBLE.spreadDelay,
      );
    });

    it('starts pills left of the viewport first', () => {
      expect(getReassembleDelay(-50, 400)).toBe(REASSEMBLE.baseDelay);
    });

    it('starts at once before the viewport is measured', () => {
      expect(getReassembleDelay(200, 0)).toBe(REASSEMBLE.baseDelay);
    });
  });
});
