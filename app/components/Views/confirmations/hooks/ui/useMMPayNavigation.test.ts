import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { useConfirmationContext } from '../../context/confirmation-context';
import useMMPayNavigation from './useMMPayNavigation';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../context/confirmation-context', () => ({
  useConfirmationContext: jest.fn(),
}));

describe('useMMPayNavigation', () => {
  const mockSetOptions = jest.fn();
  const mockBackHandlerRemove = jest.fn();
  let mmPayRef: { current: (() => void) | false };

  beforeEach(() => {
    jest.clearAllMocks();
    mmPayRef = { current: false };

    (useNavigation as jest.Mock).mockReturnValue({
      setOptions: mockSetOptions,
    });

    (useConfirmationContext as jest.Mock).mockReturnValue({
      mmPayRequestInProgressNavHandler: mmPayRef,
    });

    jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({
      remove: mockBackHandlerRemove,
    });
  });

  describe('when keyboard is visible (input state)', () => {
    it('sets mmPayRequestInProgressNavHandler to false', () => {
      renderHook(() => useMMPayNavigation(true, jest.fn()));

      expect(mmPayRef.current).toBe(false);
    });

    it('enables gesture', () => {
      renderHook(() => useMMPayNavigation(true, jest.fn()));

      expect(mockSetOptions).toHaveBeenCalledWith({ gestureEnabled: true });
    });

    it('does not register BackHandler', () => {
      renderHook(() => useMMPayNavigation(true, jest.fn()));

      expect(BackHandler.addEventListener).not.toHaveBeenCalled();
    });

    it('resets ref on cleanup', () => {
      mmPayRef.current = jest.fn();
      const { unmount } = renderHook(() => useMMPayNavigation(true, jest.fn()));

      unmount();

      expect(mmPayRef.current).toBe(false);
    });
  });

  describe('when keyboard is hidden (quote state)', () => {
    it('sets mmPayRequestInProgressNavHandler to showKeyboard function', () => {
      const mockSetIsKeyboardVisible = jest.fn();
      renderHook(() => useMMPayNavigation(false, mockSetIsKeyboardVisible));

      expect(typeof mmPayRef.current).toBe('function');

      (mmPayRef.current as () => void)();
      expect(mockSetIsKeyboardVisible).toHaveBeenCalledWith(true);
    });

    it('disables gesture', () => {
      renderHook(() => useMMPayNavigation(false, jest.fn()));

      expect(mockSetOptions).toHaveBeenCalledWith({ gestureEnabled: false });
    });

    it('registers BackHandler listener', () => {
      renderHook(() => useMMPayNavigation(false, jest.fn()));

      expect(BackHandler.addEventListener).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function),
      );
    });

    it('BackHandler calls setIsKeyboardVisible(true) when ref is truthy', () => {
      const mockSetIsKeyboardVisible = jest.fn();
      renderHook(() => useMMPayNavigation(false, mockSetIsKeyboardVisible));

      const backHandler = (BackHandler.addEventListener as jest.Mock).mock
        .calls[0][1];
      const result = backHandler();

      expect(result).toBe(true);
      expect(mockSetIsKeyboardVisible).toHaveBeenCalledWith(true);
    });

    it('BackHandler returns false when ref is falsy', () => {
      renderHook(() => useMMPayNavigation(false, jest.fn()));

      mmPayRef.current = false;

      const backHandler = (BackHandler.addEventListener as jest.Mock).mock
        .calls[0][1];
      const result = backHandler();

      expect(result).toBe(false);
    });

    it('cleans up BackHandler and resets ref on unmount', () => {
      const { unmount } = renderHook(() =>
        useMMPayNavigation(false, jest.fn()),
      );

      unmount();

      expect(mockBackHandlerRemove).toHaveBeenCalledTimes(1);
      expect(mmPayRef.current).toBe(false);
    });
  });

  describe('when keyboardEverShown ref is provided', () => {
    describe('and keyboard was never shown', () => {
      it('sets mmPayRequestInProgressNavHandler to false', () => {
        const keyboardEverShown = { current: false };
        renderHook(() =>
          useMMPayNavigation(false, jest.fn(), keyboardEverShown),
        );

        expect(mmPayRef.current).toBe(false);
      });

      it('enables gesture', () => {
        const keyboardEverShown = { current: false };
        renderHook(() =>
          useMMPayNavigation(false, jest.fn(), keyboardEverShown),
        );

        expect(mockSetOptions).toHaveBeenCalledWith({ gestureEnabled: true });
      });

      it('does not register BackHandler', () => {
        const keyboardEverShown = { current: false };
        renderHook(() =>
          useMMPayNavigation(false, jest.fn(), keyboardEverShown),
        );

        expect(BackHandler.addEventListener).not.toHaveBeenCalled();
      });

      it('resets ref on cleanup', () => {
        mmPayRef.current = jest.fn();
        const keyboardEverShown = { current: false };
        const { unmount } = renderHook(() =>
          useMMPayNavigation(false, jest.fn(), keyboardEverShown),
        );

        unmount();

        expect(mmPayRef.current).toBe(false);
      });
    });

    describe('and keyboard was previously shown', () => {
      it('sets handler to showKeyboard function', () => {
        const keyboardEverShown = { current: true };
        const mockSetIsKeyboardVisible = jest.fn();
        renderHook(() =>
          useMMPayNavigation(
            false,
            mockSetIsKeyboardVisible,
            keyboardEverShown,
          ),
        );

        expect(typeof mmPayRef.current).toBe('function');

        (mmPayRef.current as () => void)();
        expect(mockSetIsKeyboardVisible).toHaveBeenCalledWith(true);
      });

      it('disables gesture', () => {
        const keyboardEverShown = { current: true };
        renderHook(() =>
          useMMPayNavigation(false, jest.fn(), keyboardEverShown),
        );

        expect(mockSetOptions).toHaveBeenCalledWith({ gestureEnabled: false });
      });

      it('registers BackHandler listener', () => {
        const keyboardEverShown = { current: true };
        renderHook(() =>
          useMMPayNavigation(false, jest.fn(), keyboardEverShown),
        );

        expect(BackHandler.addEventListener).toHaveBeenCalledWith(
          'hardwareBackPress',
          expect.any(Function),
        );
      });
    });
  });

  describe('transitions', () => {
    it('switches from quote state to input state', () => {
      const mockSetIsKeyboardVisible = jest.fn();
      const { rerender } = renderHook(
        ({ visible }) => useMMPayNavigation(visible, mockSetIsKeyboardVisible),
        { initialProps: { visible: false } },
      );

      expect(typeof mmPayRef.current).toBe('function');
      expect(BackHandler.addEventListener).toHaveBeenCalledTimes(1);

      rerender({ visible: true });

      expect(mmPayRef.current).toBe(false);
      expect(mockBackHandlerRemove).toHaveBeenCalledTimes(1);
      expect(mockSetOptions).toHaveBeenLastCalledWith({
        gestureEnabled: true,
      });
    });

    it('switches from input state to quote state', () => {
      const mockSetIsKeyboardVisible = jest.fn();
      const { rerender } = renderHook(
        ({ visible }) => useMMPayNavigation(visible, mockSetIsKeyboardVisible),
        { initialProps: { visible: true } },
      );

      expect(mmPayRef.current).toBe(false);
      expect(BackHandler.addEventListener).not.toHaveBeenCalled();

      rerender({ visible: false });

      expect(typeof mmPayRef.current).toBe('function');
      expect(BackHandler.addEventListener).toHaveBeenCalledTimes(1);
      expect(mockSetOptions).toHaveBeenLastCalledWith({
        gestureEnabled: false,
      });
    });
  });
});
