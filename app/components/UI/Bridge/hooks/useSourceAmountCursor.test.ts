import { act, renderHook } from '@testing-library/react-native';
import { Keys } from '../../../Base/Keypad';
import {
  useSourceAmountCursor,
  type UseSourceAmountCursorParams,
} from './useSourceAmountCursor';

const createSelectionEvent = (start: number) =>
  ({
    nativeEvent: {
      selection: {
        start,
        end: start,
      },
    },
  }) as const;

describe('useSourceAmountCursor', () => {
  it('uses keypad value directly when cursor position is not manually set', () => {
    const onSourceAmountChange = jest.fn();

    const { result } = renderHook(() =>
      useSourceAmountCursor({
        sourceAmount: '1234',
        sourceTokenDecimals: 18,
        maxInputLength: 10,
        onSourceAmountChange,
      }),
    );

    act(() => {
      result.current.handleKeypadChange({
        value: '12345',
        valueAsNumber: 12345,
        pressedKey: Keys.Digit5,
      });
    });

    expect(onSourceAmountChange).toHaveBeenCalledWith('12345');
  });

  it('applies keypad edits at the selected cursor position', () => {
    const onSourceAmountChange = jest.fn();
    const initialProps: UseSourceAmountCursorParams = {
      sourceAmount: '123',
      sourceTokenDecimals: 18,
      maxInputLength: 10,
      onSourceAmountChange,
    };
    const { result, rerender } = renderHook(
      (props: UseSourceAmountCursorParams) => useSourceAmountCursor(props),
      {
        initialProps,
      },
    );

    act(() => {
      result.current.handleSourceSelectionChange(createSelectionEvent(2));
    });

    expect(result.current.sourceSelection).toEqual({ start: 2, end: 2 });

    act(() => {
      result.current.handleKeypadChange({
        value: '1239',
        valueAsNumber: 1239,
        pressedKey: Keys.Digit9,
      });
    });

    expect(onSourceAmountChange).toHaveBeenCalledWith('1293');

    act(() => {
      rerender({
        ...initialProps,
        sourceAmount: '1293',
      });
    });

    expect(result.current.sourceSelection).toEqual({ start: 4, end: 4 });
  });

  it('clears controlled selection when cursor is reset', () => {
    const onSourceAmountChange = jest.fn();
    const { result } = renderHook(() =>
      useSourceAmountCursor({
        sourceAmount: '123',
        sourceTokenDecimals: 18,
        maxInputLength: 10,
        onSourceAmountChange,
      }),
    );

    act(() => {
      result.current.handleSourceSelectionChange(createSelectionEvent(2));
    });
    expect(result.current.sourceSelection).toEqual({ start: 2, end: 2 });

    act(() => {
      result.current.resetSourceAmountCursorPosition();
    });
    expect(result.current.sourceSelection).toBeUndefined();
  });

  it('enforces max input length', () => {
    const onSourceAmountChange = jest.fn();

    const { result } = renderHook(() =>
      useSourceAmountCursor({
        sourceAmount: '1234',
        sourceTokenDecimals: 18,
        maxInputLength: 5,
        onSourceAmountChange,
      }),
    );

    act(() => {
      result.current.handleKeypadChange({
        value: '12345',
        valueAsNumber: 12345,
        pressedKey: Keys.Digit5,
      });
    });

    expect(onSourceAmountChange).not.toHaveBeenCalled();
  });
});
