import {
  OVERLAY_CLOSE_DURATION,
  OVERLAY_OPEN_DURATION,
  OVERLAY_OPEN_EASING,
  SHEET_DIALOG_CLOSE_DURATION,
  SHEET_DIALOG_CLOSE_EASING,
  SHEET_DIALOG_DRAG_DISMISS_OFFSET,
  SHEET_DIALOG_DRAG_DISMISS_VELOCITY,
  SHEET_DIALOG_DRAG_ELASTIC_DOWN,
  SHEET_DIALOG_OFFSCREEN_FACTOR,
  SHEET_DIALOG_SPRING,
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
  it('matches DS sheet open spring (critically damped)', () => {
    expect(SHEET_DIALOG_SPRING).toEqual({
      stiffness: 540,
      damping: 55,
      mass: 1,
    });
  });

  it('matches DS sheet dismiss tween and offscreen factor', () => {
    expect(SHEET_DIALOG_CLOSE_DURATION).toBe(280);
    expect(SHEET_DIALOG_CLOSE_EASING).toEqual([0.32, 0.72, 0, 1]);
    expect(SHEET_DIALOG_OFFSCREEN_FACTOR).toBe(1.05);
  });

  it('matches DS drag dismiss thresholds', () => {
    expect(SHEET_DIALOG_DRAG_DISMISS_OFFSET).toBe(120);
    expect(SHEET_DIALOG_DRAG_DISMISS_VELOCITY).toBe(800);
    expect(SHEET_DIALOG_DRAG_ELASTIC_DOWN).toBe(1);
  });

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

  it('matches DS backdrop open / close durations', () => {
    expect(OVERLAY_OPEN_DURATION).toBe(400);
    expect(OVERLAY_CLOSE_DURATION).toBe(200);
  });

  it('uses the content ease curve for backdrop open', () => {
    expect(OVERLAY_OPEN_EASING).toEqual(SHEET_STACK_CONTENT_EASING);
  });
});
