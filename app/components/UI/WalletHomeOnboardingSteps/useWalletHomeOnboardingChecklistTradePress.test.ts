import { renderHook, act } from '@testing-library/react-native';
import { ActionLocation } from '../../../util/analytics/actionButtonTracking';
import { useWalletHomeOnboardingChecklistTradePress } from './useWalletHomeOnboardingChecklistTradePress';
import type { BridgeToken } from '../Bridge/types';
import type { WalletHomeOnboardingTradeSwapPair } from './walletHomeOnboardingTradeSwapBalances';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';

const mockGoToSwaps = jest.fn();
const mockUseSwapBridgeNavigation = jest.fn((args: unknown) => ({
  goToSwaps: mockGoToSwaps,
}));
jest.mock('../Bridge/hooks/useSwapBridgeNavigation', () => ({
  ...jest.requireActual('../Bridge/hooks/useSwapBridgeNavigation'),
  useSwapBridgeNavigation: (args: unknown) => mockUseSwapBridgeNavigation(args),
}));

const mockUseWalletHomeOnboardingTradeSwapPair = jest.fn();
jest.mock('./useWalletHomeOnboardingTradeSwapPair', () => ({
  useWalletHomeOnboardingTradeSwapPair: () =>
    mockUseWalletHomeOnboardingTradeSwapPair(),
}));

describe('useWalletHomeOnboardingChecklistTradePress', () => {
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
      useWalletHomeOnboardingChecklistTradePress(),
    );

    act(() => {
      result.current();
    });

    expect(mockUseSwapBridgeNavigation).toHaveBeenCalledWith({
      location: MetaMetricsSwapsEventSource.MainView,
      sourcePage: 'MainView',
    });
    expect(mockGoToSwaps).toHaveBeenCalledWith({
      sourceTokenOverride: sourceToken,
      destTokenOverride: destToken,
      swapButtonClickLocationOverride: ActionLocation.ONBOARDING_CHECKLIST,
    });
  });

  it('falls back to default goToSwaps when no swap pair', () => {
    const { result } = renderHook(() =>
      useWalletHomeOnboardingChecklistTradePress(),
    );

    act(() => {
      result.current();
    });

    expect(mockUseSwapBridgeNavigation).toHaveBeenCalledWith({
      location: MetaMetricsSwapsEventSource.MainView,
      sourcePage: 'MainView',
    });
    expect(mockGoToSwaps).toHaveBeenCalledWith({
      swapButtonClickLocationOverride: ActionLocation.ONBOARDING_CHECKLIST,
    });
  });

  it('uses swap pair resolved after mount', () => {
    mockUseWalletHomeOnboardingTradeSwapPair.mockReturnValue(undefined);

    const { result, rerender } = renderHook(() =>
      useWalletHomeOnboardingChecklistTradePress(),
    );

    act(() => {
      result.current();
    });

    expect(mockUseSwapBridgeNavigation).toHaveBeenCalledWith({
      location: MetaMetricsSwapsEventSource.MainView,
      sourcePage: 'MainView',
    });
    expect(mockGoToSwaps).toHaveBeenCalledWith({
      swapButtonClickLocationOverride: ActionLocation.ONBOARDING_CHECKLIST,
    });

    mockUseWalletHomeOnboardingTradeSwapPair.mockReturnValue(swapPair);
    rerender({});

    act(() => {
      result.current();
    });

    expect(mockUseSwapBridgeNavigation).toHaveBeenCalledWith({
      location: MetaMetricsSwapsEventSource.MainView,
      sourcePage: 'MainView',
    });
    expect(mockGoToSwaps).toHaveBeenCalledWith(
      sourceToken,
      destToken,
      undefined,
      undefined,
      ActionLocation.ONBOARDING_CHECKLIST,
    );
  });
});
