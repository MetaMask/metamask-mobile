import { renderHook, act } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { Keyboard, Platform } from 'react-native';
import { useQuickBuySearchKeyboard } from './useQuickBuySearchKeyboard';

const mockToken: TrendingAsset = {
  assetId: 'eip155:1/slip44:60',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  price: '2000',
  aggregatedUsdVolume: 1_000_000,
  marketCap: 100_000_000,
};

describe('useQuickBuySearchKeyboard', () => {
  let keyboardShowCallback: (() => void) | undefined;

  beforeEach(() => {
    keyboardShowCallback = undefined;
    jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
    jest
      .spyOn(Keyboard, 'addListener')
      .mockImplementation(
        (event, callback: Parameters<typeof Keyboard.addListener>[1]) => {
          if (
            event ===
            (Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow')
          ) {
            keyboardShowCallback = callback as () => void;
          }
          return { remove: jest.fn() } as unknown as ReturnType<
            typeof Keyboard.addListener
          >;
        },
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('dismisses the keyboard when Quick Buy opens', () => {
    const closeQuickBuy = jest.fn();

    const { rerender } = renderHook(
      (props: { token: TrendingAsset | null }) =>
        useQuickBuySearchKeyboard(props.token, closeQuickBuy),
      { initialProps: { token: null as TrendingAsset | null } },
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
