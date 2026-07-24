import {
  OVERLAY_CLOSE_DURATION,
  OVERLAY_OPEN_DURATION,
  OVERLAY_OPEN_EASING,
  SHEET_STACK_CONTENT_EASING,
  SHEET_STACK_HEIGHT_DURATION,
  SHEET_STACK_HEIGHT_EASING,
  SHEET_STACK_OPACITY_IN_DELAY,
  SHEET_STACK_OPACITY_IN_DURATION,
  SHEET_STACK_OPACITY_OUT_DURATION,
  SHEET_STACK_PUSH_DURATION,
  SHEET_STACK_PUSH_EASING,
} from './sheetStackMotion';

describe('sheetStackMotion', () => {
  it('matches DS in-sheet stack durations (0.45s slide / height)', () => {
    expect(SHEET_STACK_PUSH_DURATION).toBe(450);
    expect(SHEET_STACK_HEIGHT_DURATION).toBe(450);
  });

  it('matches DS opacity crossfade timings', () => {
    expect(SHEET_STACK_OPACITY_IN_DURATION).toBe(220);
    expect(SHEET_STACK_OPACITY_IN_DELAY).toBe(50);
    expect(SHEET_STACK_OPACITY_OUT_DURATION).toBe(80);
  });

  it('uses the content ease curve for push and height', () => {
    expect(SHEET_STACK_CONTENT_EASING).toEqual([0.16, 1, 0.3, 1]);
    expect(SHEET_STACK_PUSH_EASING).toEqual(SHEET_STACK_CONTENT_EASING);
    expect(SHEET_STACK_HEIGHT_EASING).toEqual(SHEET_STACK_CONTENT_EASING);
  });

  it('matches installed BottomSheetDialog open (Fast) and DS close', () => {
    expect(OVERLAY_OPEN_DURATION).toBe(150);
    expect(OVERLAY_CLOSE_DURATION).toBe(200);
  });

  it('uses the content ease curve for backdrop open', () => {
    expect(OVERLAY_OPEN_EASING).toEqual(SHEET_STACK_CONTENT_EASING);
  });
});
