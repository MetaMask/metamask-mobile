import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useWalletHomeOnboardingTradeSwapPair } from './useWalletHomeOnboardingTradeSwapPair';
import {
  selectWalletHomeOnboardingTradeSwapPair,
  type WalletHomeOnboardingTradeSwapPair,
} from './walletHomeOnboardingTradeSwapBalances';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);

describe('useWalletHomeOnboardingTradeSwapPair', () => {
  const swapPair = {
    sourceToken: { symbol: 'mUSD' },
    destToken: { symbol: 'ETH' },
  } as WalletHomeOnboardingTradeSwapPair;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('subscribes to the memoized trade swap pair selector', () => {
    mockUseSelector.mockReturnValue(swapPair);

    const { result } = renderHook(() => useWalletHomeOnboardingTradeSwapPair());

    expect(mockUseSelector).toHaveBeenCalledWith(
      selectWalletHomeOnboardingTradeSwapPair,
    );
    expect(result.current).toBe(swapPair);
  });
});
