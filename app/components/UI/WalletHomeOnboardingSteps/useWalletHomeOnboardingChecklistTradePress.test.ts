import { renderHook, act } from '@testing-library/react-native';
import { ActionLocation } from '../../../util/analytics/actionButtonTracking';
import { useWalletHomeOnboardingChecklistTradePress } from './useWalletHomeOnboardingChecklistTradePress';
import type { BridgeToken } from '../Bridge/types';
import type { WalletHomeOnboardingTradeSwapPair } from './walletHomeOnboardingTradeSwapBalances';

const mockUseWalletHomeOnboardingTradeSwapPair = jest.fn();
jest.mock('./useWalletHomeOnboardingTradeSwapPair', () => ({
  useWalletHomeOnboardingTradeSwapPair: () =>
    mockUseWalletHomeOnboardingTradeSwapPair(),
}));

describe('useWalletHomeOnboardingChecklistTradePress', () => {
  const goToSwaps = jest.fn();

  const sourceToken = {
    address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
    symbol: 'mUSD',
    name: 'MetaMask USD',
    decimals: 6,
    chainId: '0x1',
  } as BridgeToken;

  const destToken = {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ether',
    decimals: 18,
    chainId: '0x1',
  } as BridgeToken;

  const swapPair = {
    sourceToken,
    destToken,
  } as WalletHomeOnboardingTradeSwapPair;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWalletHomeOnboardingTradeSwapPair.mockReturnValue(undefined);
  });

  it('calls goToSwaps with swap pair when resolved', () => {
    mockUseWalletHomeOnboardingTradeSwapPair.mockReturnValue(swapPair);

    const { result } = renderHook(() =>
      useWalletHomeOnboardingChecklistTradePress(goToSwaps),
    );

    act(() => {
      result.current();
    });

    expect(goToSwaps).toHaveBeenCalledWith(
      sourceToken,
      destToken,
      undefined,
      undefined,
      ActionLocation.ONBOARDING_CHECKLIST,
    );
  });

  it('falls back to default goToSwaps when no swap pair', () => {
    const { result } = renderHook(() =>
      useWalletHomeOnboardingChecklistTradePress(goToSwaps),
    );

    act(() => {
      result.current();
    });

    expect(goToSwaps).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
      undefined,
      ActionLocation.ONBOARDING_CHECKLIST,
    );
  });
});
