import {
  DISPERSE,
  getDisperseMotion,
  getReassembleDelay,
  isPillOnScreen,
  ON_SCREEN_MARGIN,
  REASSEMBLE,
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
