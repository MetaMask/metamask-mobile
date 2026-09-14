import { scheduleAfterPaint } from './scheduleAfterPaint';

describe('scheduleAfterPaint', () => {
  const originalRaf = global.requestAnimationFrame;
  const originalCancelRaf = global.cancelAnimationFrame;

  afterEach(() => {
    global.requestAnimationFrame = originalRaf;
    global.cancelAnimationFrame = originalCancelRaf;
    jest.useRealTimers();
  });

  it('runs the callback after two animation frames', () => {
    const frames: FrameRequestCallback[] = [];
    global.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    global.cancelAnimationFrame = jest.fn();

    const callback = jest.fn();
    scheduleAfterPaint(callback);

    expect(callback).not.toHaveBeenCalled();
    expect(frames).toHaveLength(1);

    frames[0](0);
    expect(callback).not.toHaveBeenCalled();
    expect(frames).toHaveLength(2);

    frames[1](0);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cancel prevents the callback from running', () => {
    const frames: FrameRequestCallback[] = [];
    const cancelIds: number[] = [];
    global.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    global.cancelAnimationFrame = jest.fn((id: number) => {
      cancelIds.push(id);
    });

    const callback = jest.fn();
    const handle = scheduleAfterPaint(callback);
    handle.cancel();

    expect(cancelIds).toEqual([1, 0]);

    frames[0]?.(0);
    frames[1]?.(0);
    expect(callback).not.toHaveBeenCalled();
  });

  it('falls back to setTimeout when requestAnimationFrame is missing', () => {
    jest.useFakeTimers();
    // @ts-expect-error — simulate environments without rAF
    global.requestAnimationFrame = undefined;

    const callback = jest.fn();
    scheduleAfterPaint(callback);

    expect(callback).not.toHaveBeenCalled();
    jest.runOnlyPendingTimers();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cancel prevents the setTimeout fallback callback', () => {
    jest.useFakeTimers();
    // @ts-expect-error — simulate environments without rAF
    global.requestAnimationFrame = undefined;

    const callback = jest.fn();
    const handle = scheduleAfterPaint(callback);
    handle.cancel();

    jest.runOnlyPendingTimers();
    expect(callback).not.toHaveBeenCalled();
  });
});
