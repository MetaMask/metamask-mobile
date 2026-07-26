import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { useConfirmationContext } from '../../context/confirmation-context';
import useMMPayNavigation from './useMMPayNavigation';
import { CustomAmountStage } from '../custom-amount/useCustomAmountStage';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../context/confirmation-context', () => ({
  useConfirmationContext: jest.fn(),
}));

const AMOUNT_INPUT = CustomAmountStage.AmountInput;
const QUOTE = CustomAmountStage.ShowTotals;

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

  describe('when stage is AmountInput (input state)', () => {
    it('sets mmPayRequestInProgressNavHandler to false', () => {
      renderHook(() => useMMPayNavigation(AMOUNT_INPUT, jest.fn()));

      expect(mmPayRef.current).toBe(false);
    });

    it('enables gesture', () => {
      renderHook(() => useMMPayNavigation(AMOUNT_INPUT, jest.fn()));

      expect(mockSetOptions).toHaveBeenCalledWith({ gestureEnabled: true });
    });

    it('does not register BackHandler', () => {
      renderHook(() => useMMPayNavigation(AMOUNT_INPUT, jest.fn()));

      expect(BackHandler.addEventListener).not.toHaveBeenCalled();
    });

    it('resets ref on cleanup', () => {
      mmPayRef.current = jest.fn();
      const { unmount } = renderHook(() =>
        useMMPayNavigation(AMOUNT_INPUT, jest.fn()),
      );

      unmount();

      expect(mmPayRef.current).toBe(false);
    });
  });

  describe('when stage is a quote state and amount input was never shown', () => {
    it('sets mmPayRequestInProgressNavHandler to false', () => {
      renderHook(() => useMMPayNavigation(QUOTE, jest.fn()));

      expect(mmPayRef.current).toBe(false);
    });

    it('enables gesture', () => {
      renderHook(() => useMMPayNavigation(QUOTE, jest.fn()));

      expect(mockSetOptions).toHaveBeenCalledWith({ gestureEnabled: true });
    });

    it('does not register BackHandler', () => {
      renderHook(() => useMMPayNavigation(QUOTE, jest.fn()));

      expect(BackHandler.addEventListener).not.toHaveBeenCalled();
    });

    it('resets ref on cleanup', () => {
      mmPayRef.current = jest.fn();
      const { unmount } = renderHook(() =>
        useMMPayNavigation(QUOTE, jest.fn()),
      );

      unmount();

      expect(mmPayRef.current).toBe(false);
    });
  });

  describe('when stage is a quote state and amount input was previously shown', () => {
    const renderPreviouslyShown = (setStage = jest.fn()) => {
      // Start in the amount-input stage so the internal "ever shown" ref latches,
      // then transition to a quote stage.
      const utils = renderHook(
        ({ stage }) => useMMPayNavigation(stage, setStage),
        { initialProps: { stage: AMOUNT_INPUT } },
      );
      utils.rerender({ stage: QUOTE });
      return utils;
    };

    it('sets mmPayRequestInProgressNavHandler to showAmountInput function', () => {
      const mockSetStage = jest.fn();
      renderPreviouslyShown(mockSetStage);

      expect(typeof mmPayRef.current).toBe('function');

      (mmPayRef.current as () => void)();
      expect(mockSetStage).toHaveBeenCalledWith(AMOUNT_INPUT);
    });

    it('disables gesture', () => {
      renderPreviouslyShown();

      expect(mockSetOptions).toHaveBeenLastCalledWith({
        gestureEnabled: false,
      });
    });

    it('registers BackHandler listener', () => {
      renderPreviouslyShown();

      expect(BackHandler.addEventListener).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function),
      );
    });

    it('BackHandler calls setStage(AmountInput) when ref is truthy', () => {
      const mockSetStage = jest.fn();
      renderPreviouslyShown(mockSetStage);

      const backHandler = (BackHandler.addEventListener as jest.Mock).mock
        .calls[0][1];
      const result = backHandler();

      expect(result).toBe(true);
      expect(mockSetStage).toHaveBeenCalledWith(AMOUNT_INPUT);
    });

    it('BackHandler returns false when ref is falsy', () => {
      renderPreviouslyShown();

      mmPayRef.current = false;

      const backHandler = (BackHandler.addEventListener as jest.Mock).mock
        .calls[0][1];
      const result = backHandler();

      expect(result).toBe(false);
    });

    it('cleans up BackHandler and resets ref on unmount', () => {
      const { unmount } = renderPreviouslyShown();

      unmount();

      expect(mockBackHandlerRemove).toHaveBeenCalledTimes(1);
      expect(mmPayRef.current).toBe(false);
    });
  });

  describe('transitions', () => {
    it('switches from quote state to input state', () => {
      const mockSetStage = jest.fn();
      const { rerender } = renderHook(
        ({ stage }) => useMMPayNavigation(stage, mockSetStage),
        { initialProps: { stage: AMOUNT_INPUT } },
      );

      // Show the input first so the quote state has a "previously shown" back
      // handler, then verify switching back to input tears it down.
      rerender({ stage: QUOTE });
      expect(typeof mmPayRef.current).toBe('function');
      expect(BackHandler.addEventListener).toHaveBeenCalledTimes(1);

      rerender({ stage: AMOUNT_INPUT });

      expect(mmPayRef.current).toBe(false);
      expect(mockBackHandlerRemove).toHaveBeenCalledTimes(1);
      expect(mockSetOptions).toHaveBeenLastCalledWith({
        gestureEnabled: true,
      });
    });

    it('switches from input state to quote state', () => {
      const mockSetStage = jest.fn();
      const { rerender } = renderHook(
        ({ stage }) => useMMPayNavigation(stage, mockSetStage),
        { initialProps: { stage: AMOUNT_INPUT } },
      );

      expect(mmPayRef.current).toBe(false);
      expect(BackHandler.addEventListener).not.toHaveBeenCalled();

      rerender({ stage: QUOTE });

      expect(typeof mmPayRef.current).toBe('function');
      expect(BackHandler.addEventListener).toHaveBeenCalledTimes(1);
      expect(mockSetOptions).toHaveBeenLastCalledWith({
        gestureEnabled: false,
      });
    });
  });
});
