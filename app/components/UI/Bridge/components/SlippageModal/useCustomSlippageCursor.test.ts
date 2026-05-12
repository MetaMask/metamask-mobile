import { act, renderHook } from '@testing-library/react-native';
import {
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import { Keys } from '../../../../Base/Keypad';
import { useCustomSlippageCursor } from './useCustomSlippageCursor';

const createSelectionEvent = (
  start: number,
): NativeSyntheticEvent<TextInputSelectionChangeEventData> =>
  ({
    nativeEvent: {
      selection: {
        start,
        end: start,
      },
    },
  }) as NativeSyntheticEvent<TextInputSelectionChangeEventData>;

describe('useCustomSlippageCursor', () => {
  it('inserts a digit at the selected cursor position', () => {
    const onValueChange = jest.fn();
    const onAttemptExceedMaxChange = jest.fn();

    const { result } = renderHook(() =>
      useCustomSlippageCursor({
        value: '12.5',
        inputMaxDecimals: 2,
        maxAmount: 1000,
        onValueChange,
        onAttemptExceedMaxChange,
      }),
    );

    act(() => {
      result.current.handleSelectionChange(createSelectionEvent(1));
    });

    act(() => {
      result.current.handleKeypadChange({
        value: '12.55',
        valueAsNumber: 12.55,
        pressedKey: Keys.Digit5,
      });
    });

    expect(onValueChange).toHaveBeenCalledWith('152.5');
    expect(onAttemptExceedMaxChange).toHaveBeenCalledWith(false);
  });

  it('backspaces at the selected cursor position', () => {
    const onValueChange = jest.fn();
    const onAttemptExceedMaxChange = jest.fn();

    const { result } = renderHook(() =>
      useCustomSlippageCursor({
        value: '12.5',
        inputMaxDecimals: 2,
        maxAmount: 100,
        onValueChange,
        onAttemptExceedMaxChange,
      }),
    );

    act(() => {
      result.current.handleSelectionChange(createSelectionEvent(2));
    });

    act(() => {
      result.current.handleKeypadChange({
        value: '12',
        valueAsNumber: 12,
        pressedKey: Keys.Back,
      });
    });

    expect(onValueChange).toHaveBeenCalledWith('1.5');
    expect(onAttemptExceedMaxChange).toHaveBeenCalledWith(false);
  });

  it('rejects edits beyond the configured decimal precision', () => {
    const onValueChange = jest.fn();
    const onAttemptExceedMaxChange = jest.fn();

    const { result } = renderHook(() =>
      useCustomSlippageCursor({
        value: '1.23',
        inputMaxDecimals: 2,
        maxAmount: 100,
        onValueChange,
        onAttemptExceedMaxChange,
      }),
    );

    act(() => {
      result.current.handleSelectionChange(createSelectionEvent(4));
    });

    act(() => {
      result.current.handleKeypadChange({
        value: '1.234',
        valueAsNumber: 1.234,
        pressedKey: Keys.Digit4,
      });
    });

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('rejects values above maxAmount and sets the exceed flag', () => {
    const onValueChange = jest.fn();
    const onAttemptExceedMaxChange = jest.fn();

    const { result } = renderHook(() =>
      useCustomSlippageCursor({
        value: '99',
        inputMaxDecimals: 2,
        maxAmount: 100,
        onValueChange,
        onAttemptExceedMaxChange,
      }),
    );

    act(() => {
      result.current.handleSelectionChange(createSelectionEvent(2));
    });

    act(() => {
      result.current.handleKeypadChange({
        value: '999',
        valueAsNumber: 999,
        pressedKey: Keys.Digit9,
      });
    });

    expect(onValueChange).not.toHaveBeenCalled();
    expect(onAttemptExceedMaxChange).toHaveBeenLastCalledWith(true);
  });

  it('collapses maxAmount followed by a decimal back to maxAmount', () => {
    const onValueChange = jest.fn();
    const onAttemptExceedMaxChange = jest.fn();

    const { result } = renderHook(() =>
      useCustomSlippageCursor({
        value: '100',
        inputMaxDecimals: 2,
        maxAmount: 100,
        onValueChange,
        onAttemptExceedMaxChange,
      }),
    );

    act(() => {
      result.current.handleSelectionChange(createSelectionEvent(3));
    });

    act(() => {
      result.current.handleKeypadChange({
        value: '100.',
        valueAsNumber: 100,
        pressedKey: Keys.Period,
      });
    });

    expect(onValueChange).toHaveBeenCalledWith('100');
    expect(onAttemptExceedMaxChange).toHaveBeenLastCalledWith(true);
  });

  it('allows editing back from an over-limit value when the next value is valid', () => {
    const onValueChange = jest.fn();
    const onAttemptExceedMaxChange = jest.fn();

    const { result } = renderHook(() =>
      useCustomSlippageCursor({
        value: '100.1',
        inputMaxDecimals: 2,
        maxAmount: 100,
        onValueChange,
        onAttemptExceedMaxChange,
      }),
    );

    act(() => {
      result.current.handleSelectionChange(createSelectionEvent(3));
    });

    act(() => {
      result.current.handleKeypadChange({
        value: '100',
        valueAsNumber: 100,
        pressedKey: Keys.Back,
      });
    });

    expect(onValueChange).toHaveBeenCalledWith('10.1');
    expect(onAttemptExceedMaxChange).toHaveBeenLastCalledWith(false);
  });

  it('clears the controlled selection when resetCursor is called', () => {
    const onValueChange = jest.fn();
    const onAttemptExceedMaxChange = jest.fn();

    const { result } = renderHook(() =>
      useCustomSlippageCursor({
        value: '12.5',
        inputMaxDecimals: 2,
        maxAmount: 100,
        onValueChange,
        onAttemptExceedMaxChange,
      }),
    );

    act(() => {
      result.current.handleSelectionChange(createSelectionEvent(2));
    });

    expect(result.current.selection).toEqual({ start: 2, end: 2 });

    act(() => {
      result.current.resetCursor();
    });

    expect(result.current.selection).toBeUndefined();
  });
});
