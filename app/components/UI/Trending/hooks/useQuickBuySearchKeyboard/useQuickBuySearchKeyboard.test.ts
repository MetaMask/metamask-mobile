import { renderHook, act } from '@testing-library/react-native';
import { Keyboard, Platform } from 'react-native';
import { useQuickBuySearchKeyboard } from './useQuickBuySearchKeyboard';

const mockToken = {
  assetId: 'eip155:1/slip44:60',
  symbol: 'ETH',
  name: 'Ethereum',
} as const;

describe('useQuickBuySearchKeyboard', () => {
  let keyboardShowCallback: (() => void) | undefined;

  beforeEach(() => {
    keyboardShowCallback = undefined;
    jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
    jest
      .spyOn(Keyboard, 'addListener')
      .mockImplementation((event, callback) => {
        if (
          event ===
          (Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow')
        ) {
          keyboardShowCallback = callback as () => void;
        }
        return { remove: jest.fn() };
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('dismisses the keyboard when Quick Buy opens', () => {
    const closeQuickBuy = jest.fn();

    const { rerender } = renderHook(
      ({ token }) => useQuickBuySearchKeyboard(token, closeQuickBuy),
      { initialProps: { token: null as typeof mockToken | null } },
    );

    expect(Keyboard.dismiss).not.toHaveBeenCalled();

    rerender({ token: mockToken });

    expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
  });

  it('closes Quick Buy when the search keyboard appears', () => {
    const closeQuickBuy = jest.fn();

    renderHook(() => useQuickBuySearchKeyboard(mockToken, closeQuickBuy));

    act(() => {
      keyboardShowCallback?.();
    });

    expect(closeQuickBuy).toHaveBeenCalledTimes(1);
  });

  it('does not close Quick Buy when the keyboard appears and the sheet is closed', () => {
    const closeQuickBuy = jest.fn();

    renderHook(() => useQuickBuySearchKeyboard(null, closeQuickBuy));

    act(() => {
      keyboardShowCallback?.();
    });

    expect(closeQuickBuy).not.toHaveBeenCalled();
  });
});
