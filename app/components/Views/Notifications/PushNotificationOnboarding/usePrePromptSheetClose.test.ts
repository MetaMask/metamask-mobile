import { renderHook } from '@testing-library/react-native';
import type { BottomSheetRef } from '@metamask/design-system-react-native';
import { usePrePromptSheetClose } from './usePrePromptSheetClose';

describe('usePrePromptSheetClose', () => {
  it('records the answer before closing and runs the action after the close callback', () => {
    const onUserAnswered = jest.fn();
    const action = jest.fn();
    const onCloseBottomSheet = jest.fn();
    const { result } = renderHook(() => usePrePromptSheetClose(onUserAnswered));
    result.current.bottomSheetRef.current = {
      onCloseBottomSheet,
    } as BottomSheetRef;

    result.current.closeWithAction(action);

    expect(onUserAnswered).toHaveBeenCalledTimes(1);
    expect(onUserAnswered.mock.invocationCallOrder[0]).toBeLessThan(
      onCloseBottomSheet.mock.invocationCallOrder[0],
    );
    expect(action).not.toHaveBeenCalled();
    onCloseBottomSheet.mock.calls[0][0]?.();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('records the answer before the close icon dismisses the sheet', () => {
    const onUserAnswered = jest.fn();
    const onCloseBottomSheet = jest.fn();
    const { result } = renderHook(() => usePrePromptSheetClose(onUserAnswered));
    result.current.bottomSheetRef.current = {
      onCloseBottomSheet,
    } as BottomSheetRef;

    result.current.closeFromIcon();

    expect(onUserAnswered.mock.invocationCallOrder[0]).toBeLessThan(
      onCloseBottomSheet.mock.invocationCallOrder[0],
    );
    expect(onCloseBottomSheet).toHaveBeenCalledWith();
  });

  it('runs the action immediately when the sheet ref is missing', () => {
    const onUserAnswered = jest.fn();
    const action = jest.fn();
    const { result } = renderHook(() => usePrePromptSheetClose(onUserAnswered));

    result.current.closeWithAction(action);

    expect(onUserAnswered.mock.invocationCallOrder[0]).toBeLessThan(
      action.mock.invocationCallOrder[0],
    );
    expect(action).toHaveBeenCalledTimes(1);
  });
});
