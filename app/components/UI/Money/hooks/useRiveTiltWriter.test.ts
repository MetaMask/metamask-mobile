import { renderHook } from '@testing-library/react-native';
import type { RiveRef } from 'rive-react-native';
import { useRiveTiltWriter } from './useRiveTiltWriter';
import { RIVE_TILT_WRITE_EPSILON } from '../utils/parallax';

const X_PROPERTY = 'xValue';
const Y_PROPERTY = 'yValue';

const setUp = ({
  viewTag = 1 as number | null,
  artboardName = 'Artboard A',
  enabled = true,
}: {
  viewTag?: number | null;
  artboardName?: string;
  enabled?: boolean;
} = {}) => {
  const setNumber = jest.fn();
  const riveRef = {
    current: {
      setNumber,
      viewTag: () => viewTag,
    } as unknown as RiveRef,
  };

  const { result, rerender } = renderHook(
    (props: { artboardName: string; enabled: boolean }) =>
      useRiveTiltWriter({
        riveRef,
        xProperty: X_PROPERTY,
        yProperty: Y_PROPERTY,
        artboardName: props.artboardName,
        enabled: props.enabled,
      }),
    { initialProps: { artboardName, enabled } },
  );

  return { setNumber, riveRef, result, rerender };
};

const writesTo = (setNumber: jest.Mock, property: string): number[] =>
  setNumber.mock.calls
    .filter(([name]) => name === property)
    .map(([, value]) => value);

describe('useRiveTiltWriter', () => {
  it('writes both axes on the first tilt', () => {
    const { setNumber, result } = setUp();

    result.current(60, 40);

    expect(writesTo(setNumber, X_PROPERTY)).toEqual([60]);
    expect(writesTo(setNumber, Y_PROPERTY)).toEqual([40]);
  });

  it('does not write again for an unchanged reading', () => {
    const { setNumber, result } = setUp();

    result.current(60, 40);
    setNumber.mockClear();
    for (let i = 0; i < 50; i++) result.current(60, 40);

    expect(setNumber).not.toHaveBeenCalled();
  });

  it('does not write a change too small to be seen', () => {
    const { setNumber, result } = setUp();

    result.current(60, 40);
    setNumber.mockClear();
    result.current(60 + RIVE_TILT_WRITE_EPSILON / 2, 40);

    expect(setNumber).not.toHaveBeenCalled();
  });

  it('writes a change at the visible threshold', () => {
    const { setNumber, result } = setUp();

    result.current(60, 40);
    setNumber.mockClear();
    result.current(60 + RIVE_TILT_WRITE_EPSILON, 40);

    expect(writesTo(setNumber, X_PROPERTY)).toEqual([
      60 + RIVE_TILT_WRITE_EPSILON,
    ]);
  });

  it('writes only the axis that moved', () => {
    const { setNumber, result } = setUp();

    result.current(60, 40);
    setNumber.mockClear();
    result.current(80, 40);

    expect(writesTo(setNumber, X_PROPERTY)).toEqual([80]);
    expect(writesTo(setNumber, Y_PROPERTY)).toEqual([]);
  });

  it('accumulates sub-threshold drift rather than discarding it', () => {
    const { setNumber, result } = setUp();

    result.current(60, 40);
    setNumber.mockClear();
    // Each step alone is below the threshold; together they cross it.
    const step = RIVE_TILT_WRITE_EPSILON * 0.6;
    result.current(60 + step, 40);
    result.current(60 + step * 2, 40);

    expect(writesTo(setNumber, X_PROPERTY)).toEqual([60 + step * 2]);
  });

  it('writes again after the artboard is swapped', () => {
    const { setNumber, result, rerender } = setUp();

    result.current(60, 40);
    setNumber.mockClear();
    rerender({ artboardName: 'Artboard B', enabled: true });
    result.current(60, 40);

    expect(writesTo(setNumber, X_PROPERTY)).toEqual([60]);
    expect(writesTo(setNumber, Y_PROPERTY)).toEqual([40]);
  });

  it('writes again after the animation is re-enabled', () => {
    const { setNumber, result, rerender } = setUp();

    result.current(60, 40);
    setNumber.mockClear();
    rerender({ artboardName: 'Artboard A', enabled: false });
    rerender({ artboardName: 'Artboard A', enabled: true });
    result.current(60, 40);

    expect(writesTo(setNumber, X_PROPERTY)).toEqual([60]);
  });

  it('does not dispatch while the native view is detached', () => {
    const { setNumber, result } = setUp({ viewTag: null });

    result.current(60, 40);

    expect(setNumber).not.toHaveBeenCalled();
  });

  it('does not dispatch when there is no Rive ref', () => {
    const setNumber = jest.fn();
    const riveRef = { current: null };
    const { result } = renderHook(() =>
      useRiveTiltWriter({
        riveRef,
        xProperty: X_PROPERTY,
        yProperty: Y_PROPERTY,
        artboardName: 'Artboard A',
        enabled: true,
      }),
    );

    result.current(60, 40);

    expect(setNumber).not.toHaveBeenCalled();
  });
});
