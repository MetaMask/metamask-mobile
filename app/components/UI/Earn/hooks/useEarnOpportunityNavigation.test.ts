import { act, renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { EthAccountType } from '@metamask/keyring-api';
import { TokenDetailsSource } from '../../TokenDetails/constants/constants';
import Routes from '../../../../constants/navigation/Routes';
import { EARN_EXPERIENCES } from '../constants/experiences';
import type {
  DiscoveryEarnAsset,
  EarnAsset,
  EarnExperience,
  HeldEarnAsset,
} from '../types/earnAssets';
import { useMoneyAccountDeposit } from '../../Money/hooks/useMoneyAccount';
import { useMoneyOnboardingNavigation } from '../../Money/hooks/useMoneyNavigation';
import useStakingChain from '../../Stake/hooks/useStakingChain';
import { MoneyPostOnboardingRedirectType } from '../../Money/types/navigation';
import Logger from '../../../../util/Logger';
import Engine from '../../../../core/Engine';
import type { TokenI } from '../../Tokens/types';
import { earnAssetToToken } from '../utils/earnAssets';
import { isEarnAssetBalanceBelowMinDepositAmount } from '../utils/earnAssets/earnAssetBalance';
import useEarnOpportunityNavigation from './useEarnOpportunityNavigation';

const mockNavigate = jest.fn();
const assetAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as const;
const mockInitiateDeposit = jest.fn();
const mockRedirectToOnboardingIfNeeded = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@metamask/controller-utils', () => ({
  toHex: (value: string) => value,
}));

jest.mock('../../Stake/hooks/useStakingChain', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../../Money/hooks/useMoneyAccount', () => ({
  __esModule: true,
  useMoneyAccountDeposit: jest.fn(),
}));
jest.mock('../../Money/hooks/useMoneyNavigation', () => ({
  __esModule: true,
  useMoneyOnboardingNavigation: jest.fn(),
}));

jest.mock('../utils/earnAssets', () => ({
  __esModule: true,
  earnAssetToToken: jest.fn(),
  getMoneyDepositPaymentToken: (earnAsset: HeldEarnAsset) => {
    const asset = earnAsset.asset;

    return {
      address: 'address' in asset ? asset.address : asset.assetId,
      chainId: asset.chainId,
    };
  },
}));
jest.mock('../utils/earnAssets/earnAssetBalance', () => ({
  __esModule: true,
  isEarnAssetBalanceBelowMinDepositAmount: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      NetworkController: {
        findNetworkClientIdByChainId: jest.fn(),
        setActiveNetwork: jest.fn(),
      },
      MultichainNetworkController: {
        setActiveNetwork: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockUseNavigation = jest.mocked(useNavigation);
const mockUseStakingChain = jest.mocked(useStakingChain);
const mockUseMoneyAccountDeposit = jest.mocked(useMoneyAccountDeposit);
const mockUseMoneyOnboardingNavigation = jest.mocked(
  useMoneyOnboardingNavigation,
);
const mockLoggerError = jest.mocked(Logger.error);
const mockEarnAssetToToken = jest.mocked(earnAssetToToken);
const mockIsEarnAssetBalanceBelowMinDepositAmount = jest.mocked(
  isEarnAssetBalanceBelowMinDepositAmount,
);
const mockEngineFindNetworkClientIdByChainId = Engine.context.NetworkController
  .findNetworkClientIdByChainId as unknown as jest.MockedFunction<
  (chainId: string) => string | undefined
>;
const mockEngineSetActiveNetwork = jest.mocked(
  Engine.context.NetworkController.setActiveNetwork,
);
const mockEngineSetMultichainActiveNetwork = jest.mocked(
  Engine.context.MultichainNetworkController.setActiveNetwork,
);

const createExperience = (
  type: EarnExperience['type'],
  id = `experience:${type}`,
): EarnExperience => ({
  id,
  type,
  role: 'underlying',
  rate: {
    type: 'APY',
    status: 'ready',
    percentage: 5,
  },
  isFeeSubsidized: false,
});

const createEarnAsset = (
  fiatBalance: number,
  experiences: readonly EarnExperience[] = [],
  chainId: string | undefined = '0x1',
): HeldEarnAsset => ({
  kind: 'held',
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  asset: {
    accountType: EthAccountType.Eoa,
    accountId: 'account-id',
    assetId: assetAddress,
    address: assetAddress,
    chainId,
    decimals: 6,
    image: 'usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    balance: String(fiatBalance),
    rawBalance: fiatBalance > 0 ? '0x1' : '0x0',
    fiat: {
      balance: fiatBalance,
      currency: 'USD',
      conversionRate: 1,
    },
    isNative: false,
  } as unknown as HeldEarnAsset['asset'],
  experiences,
});

const createDiscoveryEarnAsset = (
  experiences: readonly EarnExperience[] = [],
): DiscoveryEarnAsset => ({
  kind: 'discovery',
  assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7' as const,
  metadata: {
    address: assetAddress,
    chainId: '0x1',
    decimals: 6,
    image: 'usdt.png',
    name: 'Tether USD',
    symbol: 'USDT',
    logo: 'usdt.png',
    isETH: false,
  },
  experiences,
});

describe('useEarnOpportunityNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as unknown as ReturnType<typeof useNavigation>);
    mockUseStakingChain.mockReturnValue({
      isStakingSupportedChain: true,
    });
    mockUseMoneyAccountDeposit.mockReturnValue({
      initiateDeposit: mockInitiateDeposit,
    });
    mockUseMoneyOnboardingNavigation.mockReturnValue({
      isOnboardingRedirectNeeded: false,
      redirectToOnboardingIfNeeded: mockRedirectToOnboardingIfNeeded,
    });
    mockEarnAssetToToken.mockImplementation((earnAsset: EarnAsset) => {
      const asset =
        earnAsset.kind === 'held' ? earnAsset.asset : earnAsset.metadata;

      return {
        address: 'address' in asset ? asset.address : asset.assetId,
        chainId: asset.chainId,
        decimals: asset.decimals,
        image: asset.image,
        name: asset.name,
        symbol: asset.symbol,
        balance: earnAsset.kind === 'held' ? earnAsset.asset.balance : '0',
        logo: asset.image,
        isETH: 'isETH' in asset ? asset.isETH : false,
        isNative: 'isNative' in asset ? asset.isNative : false,
      } as TokenI;
    });
    mockIsEarnAssetBalanceBelowMinDepositAmount.mockImplementation(
      (earnAsset: EarnAsset) =>
        earnAsset.kind !== 'held' ||
        Number(earnAsset.asset.fiat?.balance ?? 0) < 0.01,
    );
    mockEngineFindNetworkClientIdByChainId.mockReturnValue('network-client-id');
    mockEngineSetActiveNetwork.mockResolvedValue(undefined);
    mockEngineSetMultichainActiveNetwork.mockResolvedValue(undefined);
    mockInitiateDeposit.mockResolvedValue(undefined);
    mockRedirectToOnboardingIfNeeded.mockReturnValue(false);
  });

  it('navigates an asset with more than one supported experience at the minimum deposit to strategy selection', () => {
    const earnAsset = createEarnAsset(0.01, [
      createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING),
      createExperience(EARN_EXPERIENCES.POOLED_STAKING),
    ]);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    act(() => {
      result.current.navigateFromEarnAsset(earnAsset);
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.EARN.MODALS.ROOT, {
      screen: Routes.EARN.MODALS.STRATEGY_SELECTION,
      params: { earnAsset },
    });
  });

  it('navigates an asset below the minimum deposit to Token Details', () => {
    const earnAsset = createEarnAsset(0);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    act(() => {
      result.current.navigateFromEarnAsset(
        earnAsset,
        TokenDetailsSource.ExploreEarn,
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      'Asset',
      expect.objectContaining({
        address: assetAddress,
        chainId: earnAsset.asset.chainId,
        source: TokenDetailsSource.ExploreEarn,
      }),
    );
  });

  it('navigates a discovery asset to Token Details', () => {
    const earnAsset = createDiscoveryEarnAsset();
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    act(() => {
      result.current.navigateFromEarnAsset(
        earnAsset,
        TokenDetailsSource.ExploreEarn,
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      'Asset',
      expect.objectContaining({
        address: earnAsset.metadata.address,
        chainId: earnAsset.metadata.chainId,
        source: TokenDetailsSource.ExploreEarn,
      }),
    );
  });

  it('starts a Money deposit for a held asset with one Money experience', async () => {
    const earnAsset = createEarnAsset(1, [
      createExperience('MONEY_ACCOUNT_DEPOSIT'),
    ]);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      result.current.navigateFromEarnAsset(earnAsset);
      await Promise.resolve();
    });

    const preferredPaymentToken = {
      address: assetAddress,
      chainId: '0x1',
    };
    expect(mockRedirectToOnboardingIfNeeded).toHaveBeenCalledWith({
      postOnboardingRedirect: {
        type: MoneyPostOnboardingRedirectType.DEPOSIT,
        preferredPaymentToken,
      },
    });
    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      preferredPaymentToken,
      intent: 'convert',
    });
  });

  it('stops Money deposit navigation when onboarding is required', async () => {
    mockRedirectToOnboardingIfNeeded.mockReturnValue(true);
    const earnAsset = createEarnAsset(1, [
      createExperience('MONEY_ACCOUNT_DEPOSIT'),
    ]);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      result.current.navigateFromEarnAsset(earnAsset);
      await Promise.resolve();
    });

    expect(mockRedirectToOnboardingIfNeeded).toHaveBeenCalled();
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  it('logs Money deposit initiation failures', async () => {
    const error = new Error('Deposit failed');
    mockInitiateDeposit.mockRejectedValue(error);
    const earnAsset = createEarnAsset(1, [
      createExperience('MONEY_ACCOUNT_DEPOSIT'),
    ]);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      result.current.navigateFromEarnAsset(earnAsset);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockLoggerError).toHaveBeenCalledWith(
      error,
      '[Earn Strategy Selection View] Failed to initiate Money deposit',
    );
  });

  it('switches network and navigates to staking for stablecoin lending', async () => {
    const earnAsset = createEarnAsset(1, [
      createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING),
    ]);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      result.current.navigateFromEarnAsset(earnAsset);
      await Promise.resolve();
    });

    expect(mockEngineFindNetworkClientIdByChainId).toHaveBeenCalledWith('0x1');
    expect(mockEngineSetActiveNetwork).toHaveBeenCalledWith(
      'network-client-id',
    );
    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: {
        token: expect.objectContaining({
          address: assetAddress,
          chainId: '0x1',
          symbol: 'USDC',
        }),
      },
    });
  });

  it('logs and stops stablecoin lending navigation without a network client', async () => {
    mockEngineFindNetworkClientIdByChainId.mockReturnValue(undefined);
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const earnAsset = createEarnAsset(1, [
      createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING),
    ]);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      result.current.navigateFromEarnAsset(earnAsset);
      await Promise.resolve();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Stablecoin lending redirect failed: could not retrieve networkClientId for chainId: 0x1',
    );
    expect(mockEngineSetActiveNetwork).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('navigates to staking for pooled staking on a supported chain', async () => {
    const earnAsset = createEarnAsset(1, [
      createExperience(EARN_EXPERIENCES.POOLED_STAKING),
    ]);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      result.current.navigateFromEarnAsset(earnAsset);
      await Promise.resolve();
    });

    expect(mockEngineSetMultichainActiveNetwork).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: {
        token: expect.objectContaining({
          address: assetAddress,
          chainId: '0x1',
        }),
      },
    });
  });

  it('switches to mainnet before navigating to pooled staking on an unsupported chain', async () => {
    mockUseStakingChain.mockReturnValue({
      isStakingSupportedChain: false,
    });
    const earnAsset = createEarnAsset(1, [
      createExperience(EARN_EXPERIENCES.POOLED_STAKING),
    ]);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      result.current.navigateFromEarnAsset(earnAsset);
      await Promise.resolve();
    });

    expect(mockEngineSetMultichainActiveNetwork).toHaveBeenCalledWith(
      'mainnet',
    );
    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: {
        token: expect.objectContaining({
          address: assetAddress,
          chainId: '0x1',
        }),
      },
    });
  });

  it('navigates to staking for TRX staking', async () => {
    const earnAsset = createEarnAsset(1, [
      createExperience(EARN_EXPERIENCES.TRX_STAKING),
    ]);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      result.current.navigateFromEarnAsset(earnAsset);
      await Promise.resolve();
    });

    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: {
        token: expect.objectContaining({
          address: assetAddress,
          chainId: '0x1',
        }),
      },
    });
  });
});
