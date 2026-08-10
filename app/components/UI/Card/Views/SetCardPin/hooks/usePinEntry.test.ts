import { act, renderHook } from '@testing-library/react-native';
import { Keys } from '../../../../../Base/Keypad';
import { usePinEntry } from './usePinEntry';
import { PIN_ERROR_RESET_DELAY_MS, PIN_UNMASK_DURATION_MS } from '../constants';

describe('usePinEntry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('appends digits and temporarily reveals the last digit', () => {
    const { result } = renderHook(() => usePinEntry());

    act(() => {
      result.current.handleKeypadChange({
        value: '1',
        valueAsNumber: 1,
        pressedKey: Keys.Digit1,
      });
    });

    expect(result.current.value).toBe('1');
    expect(result.current.revealedIndex).toBe(0);

    act(() => {
      jest.advanceTimersByTime(PIN_UNMASK_DURATION_MS);
    });

    expect(result.current.revealedIndex).toBeNull();
  });

  it('locks input on error then resets after the delay', () => {
    const { result } = renderHook(() => usePinEntry());
    const onAfterReset = jest.fn();

    act(() => {
      result.current.handleKeypadChange({
        value: '1',
        valueAsNumber: 1,
        pressedKey: Keys.Digit1,
      });
      result.current.triggerError('bad', onAfterReset);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.isInputLocked).toBe(true);
    expect(result.current.errorMessage).toBe('bad');

    act(() => {
      result.current.handleKeypadChange({
        value: '2',
        valueAsNumber: 2,
        pressedKey: Keys.Digit2,
      });
    });
    expect(result.current.value).toBe('1');

    act(() => {
      jest.advanceTimersByTime(PIN_ERROR_RESET_DELAY_MS);
    });

    expect(result.current.value).toBe('');
    expect(result.current.isError).toBe(false);
    expect(result.current.isInputLocked).toBe(false);
    expect(onAfterReset).toHaveBeenCalled();
  });
});
