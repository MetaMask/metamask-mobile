import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import type { RootState } from '../../../reducers';
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';
import { useWalletHomeOnboardingTradeSwapPair } from './useWalletHomeOnboardingTradeSwapPair';
import type { WalletHomeOnboardingTradeSwapPair } from './walletHomeOnboardingTradeSwapBalances';

const mockResolveWalletHomeOnboardingTradeSwapPair = jest.fn();
jest.mock('./walletHomeOnboardingTradeSwapBalances', () => ({
  resolveWalletHomeOnboardingTradeSwapPair: (...args: unknown[]) =>
    mockResolveWalletHomeOnboardingTradeSwapPair(...args),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);

describe('useWalletHomeOnboardingTradeSwapPair', () => {
  const mockState = { engine: {} } as RootState;
  const accountAddress = '0xAccount1' as Hex;
  const swapPair = {
    sourceToken: { symbol: 'mUSD' },
    destToken: { symbol: 'ETH' },
  } as WalletHomeOnboardingTradeSwapPair;

  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveWalletHomeOnboardingTradeSwapPair.mockReturnValue(swapPair);
  });

  it('returns undefined when selected account address is missing', () => {
    mockUseSelector
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined);

    const { result } = renderHook(() => useWalletHomeOnboardingTradeSwapPair());

    expect(result.current).toBeUndefined();
    expect(mockResolveWalletHomeOnboardingTradeSwapPair).not.toHaveBeenCalled();
  });

  it('resolves pair from state and selected account via selector', () => {
    let pairSelector: ((state: RootState) => unknown) | undefined;

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountAddress) {
        return accountAddress;
      }

      pairSelector = selector as (state: RootState) => unknown;
      return (selector as (state: RootState) => unknown)(mockState);
    });

    const { result } = renderHook(() => useWalletHomeOnboardingTradeSwapPair());

    expect(pairSelector).toBeDefined();
    expect(pairSelector?.(mockState)).toBe(swapPair);
    expect(mockResolveWalletHomeOnboardingTradeSwapPair).toHaveBeenCalledWith(
      mockState,
      accountAddress,
    );
    expect(result.current).toBe(swapPair);
  });
});
