import { act, renderHook } from '@testing-library/react-native';
import { type TextInputSelectionChangeEvent } from 'react-native';
import { Keys } from '../../../../Base/Keypad';
import { useCostToleranceCursor } from './useCostToleranceCursor';

const createSelectionEvent = (start: number): TextInputSelectionChangeEvent =>
  ({
    nativeEvent: {
      selection: {
        start,
        end: start,
      },
    },
  }) as TextInputSelectionChangeEvent;

describe('useCostToleranceCursor', () => {
  const renderCursor = ({
    value,
    maxAmount = 100,
    inputMaxDecimals = 2,
  }: {
    value: string;
    maxAmount?: number;
    inputMaxDecimals?: number;
  }) => {
    const onValueChange = jest.fn();
    const onAttemptExceedMaxChange = jest.fn();
    const { result } = renderHook(() =>
      useCostToleranceCursor({
        value,
        inputMaxDecimals,
        maxAmount,
        onValueChange,
        onAttemptExceedMaxChange,
      }),
    );

    return { result, onValueChange, onAttemptExceedMaxChange };
  };

  it('appends keypad input when the cursor was never moved', () => {
    const { result, onValueChange } = renderCursor({ value: '1' });

    act(() => {
      result.current.handleKeypadChange({
        value: '12',
        valueAsNumber: 12,
        pressedKey: Keys.Digit2,
      });
    });

    expect(onValueChange).toHaveBeenCalledWith('12');
  });

  it('inserts a digit at the selected cursor position', () => {
    const { result, onValueChange } = renderCursor({
      value: '12.5',
      maxAmount: 1000,
    });

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
  });

  it('ignores input that would exceed the max amount and flags the attempt', () => {
    const { result, onValueChange, onAttemptExceedMaxChange } = renderCursor({
      value: '99',
      maxAmount: 100,
    });

    act(() => {
      result.current.handleKeypadChange({
        value: '999',
        valueAsNumber: 999,
        pressedKey: Keys.Digit9,
      });
    });

    expect(onValueChange).not.toHaveBeenCalled();
    expect(onAttemptExceedMaxChange).toHaveBeenCalledWith(true);
  });

  it('clears the exceeded max flag once an accepted value is entered', () => {
    const { result, onAttemptExceedMaxChange } = renderCursor({
      value: '1',
      maxAmount: 100,
    });

    act(() => {
      result.current.handleKeypadChange({
        value: '12',
        valueAsNumber: 12,
        pressedKey: Keys.Digit2,
      });
    });

    expect(onAttemptExceedMaxChange).toHaveBeenCalledWith(false);
  });

  it('ignores input exceeding the allowed decimals', () => {
    const { result, onValueChange } = renderCursor({
      value: '1.23',
      inputMaxDecimals: 2,
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

  it('clears the selection when the cursor is reset', () => {
    const { result } = renderCursor({ value: '12.5' });

    act(() => {
      result.current.handleSelectionChange(createSelectionEvent(1));
    });

    expect(result.current.selection).toEqual({ start: 1, end: 1 });

    act(() => {
      result.current.resetCursor();
    });

    expect(result.current.selection).toBeUndefined();
  });
});
