import { act, renderHook } from '@testing-library/react-native';
import {
  buybackFlightFromBounds,
  useReplitBuybackFeedback,
} from './useReplitBuybackFeedback';

describe('Replit buyback feedback anchors', () => {
  it('converts measured window centers to overlay coordinates without changing balances', () => {
    expect(
      buybackFlightFromBounds(
        { x: 20, y: 550, width: 100, height: 40 },
        { x: 240, y: 60, width: 60, height: 24 },
        { x: 10, y: 30, width: 390, height: 700 },
      ),
    ).toEqual({ source: { x: 60, y: 540 }, target: { x: 260, y: 42 } });
    expect(
      buybackFlightFromBounds(
        { x: 20, y: 550, width: 0, height: 40 },
        { x: 240, y: 60, width: 60, height: 24 },
        { x: 10, y: 30, width: 390, height: 700 },
      ),
    ).toBeUndefined();
  });

  it('waits for confirmed success and the real destination layout before showing a flight', () => {
    const { result } = renderHook(useReplitBuybackFeedback);
    Object.assign(result.current.sourceRef, {
      current: {
        measureInWindow: (callback: (...bounds: number[]) => void) =>
          callback(20, 550, 100, 40),
      },
    });
    Object.assign(result.current.rootRef, {
      current: {
        measureInWindow: (callback: (...bounds: number[]) => void) =>
          callback(10, 30, 390, 700),
      },
    });
    act(() => result.current.startCapture(42));
    expect(result.current.flight).toBeUndefined();
    expect(result.current.walletVisible).toBe(false);
    act(() => result.current.complete());
    expect(result.current.walletVisible).toBe(true);
    expect(result.current.flight).toBeUndefined();
    Object.assign(result.current.targetRef, {
      current: {
        measureInWindow: (callback: (...bounds: number[]) => void) =>
          callback(240, 60, 60, 24),
      },
    });
    act(() => result.current.onTargetLayout());
    expect(result.current.flight).toMatchObject({
      source: { x: 60, y: 540 },
      target: { x: 260, y: 42 },
    });
    expect(result.current.previousBalance).toBe(42);
    act(() => result.current.finish());
    expect(result.current.flight).toBeUndefined();
  });

  it('ignores a capture callback after navigation unmounts the scene', () => {
    const measure = jest.fn();
    const rootMeasure = jest.fn();
    const { result, unmount } = renderHook(useReplitBuybackFeedback);
    Object.assign(result.current.sourceRef, {
      current: { measureInWindow: measure },
    });
    Object.assign(result.current.rootRef, {
      current: { measureInWindow: rootMeasure },
    });
    act(() => result.current.startCapture(42));
    act(() => result.current.complete());
    unmount();
    measure.mock.calls[0][0](20, 550, 100, 40);
    expect(rootMeasure).not.toHaveBeenCalled();
  });

  it('ignores a late completion from an older sale animation', () => {
    const { result } = renderHook(useReplitBuybackFeedback);
    for (const [ref, bounds] of [
      [result.current.sourceRef, [20, 550, 100, 40]],
      [result.current.rootRef, [10, 30, 390, 700]],
      [result.current.targetRef, [240, 60, 60, 24]],
    ] as const) {
      Object.assign(ref, {
        current: {
          measureInWindow: (callback: (...values: number[]) => void) =>
            callback(...bounds),
        },
      });
    }
    act(() => result.current.startCapture(42));
    act(() => result.current.complete());
    const oldFinish = result.current.finish;
    const oldIdentity = result.current.flight?.identity;

    act(() => result.current.startCapture(55));
    act(() => result.current.complete());
    const currentFlight = result.current.flight;
    expect(currentFlight?.identity).not.toBe(oldIdentity);
    act(oldFinish);
    expect(result.current.flight).toBe(currentFlight);
    expect(result.current.previousBalance).toBe(55);

    act(() => result.current.finish());
    expect(result.current.flight).toBeUndefined();
  });
});
