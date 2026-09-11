import { act, renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import { TokenDetailsSource } from '../../TokenDetails/constants/constants';
import Routes from '../../../../constants/navigation/Routes';
import { EARN_EXPERIENCES } from '../constants/experiences';
import type { EarnAsset, EarnExperience } from '../types/earnAssets';
import { MoneyPostOnboardingRedirectType } from '../../Money/types/navigation';
import { useMoneyAccountDeposit } from '../../Money/hooks/useMoneyAccount';
import useStakingChain from '../../Stake/hooks/useStakingChain';
import Logger from '../../../../util/Logger';
import Engine from '../../../../core/Engine';
import type { TokenI } from '../../Tokens/types';
import { moneyFormatFiat } from '../../Money/utils/moneyFormatFiat';
import { earnAssetToToken } from '../utils/earnAssets';
import type { EarnToastOptions } from './useEarnToasts';
import useEarnOpportunityNavigation, {
  getEarnSelectedStrategyRedirectTarget,
  getEarnOpportunityDestination,
  getEarnAssetEntryRedirectTarget,
} from './useEarnOpportunityNavigation';
import {
  EARN_MODULE_ENTRY_POINTS,
  EARN_MODULE_REDIRECT_TARGETS,
  EARN_MODULE_SCREEN_NAMES,
} from '../constants/earnModuleEvents';
import type { EarnAssetAcquisitionRoute } from './useEarnAssetAcquisitionNavigation';

const mockNavigate = jest.fn();
const assetAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as const;
const usdtAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7' as const;
const usdtAssetId = `eip155:1/erc20:${usdtAddress}` as EarnAsset['assetId'];
const mockInitiateDeposit = jest.fn();
const mockResolveEarnAssetAcquisitionRoute = jest.fn<
  EarnAssetAcquisitionRoute | undefined,
  [EarnAsset, EarnExperience]
>();
const mockNavigateToEarnAssetAcquisitionRoute = jest.fn<
  Promise<void>,
  [EarnAssetAcquisitionRoute]
>();
const mockRedirectToOnboardingIfNeeded = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../Money/utils/moneyFormatFiat', () => ({
  moneyFormatFiat: (value: { toNumber: () => number }, currency: string) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value.toNumber()),
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
  useMoneyOnboardingNavigation: jest.fn(() => ({
    redirectToOnboardingIfNeeded: mockRedirectToOnboardingIfNeeded,
  })),
}));
jest.mock('./useEarnAssetAcquisitionNavigation', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    resolveEarnAssetAcquisitionRoute: mockResolveEarnAssetAcquisitionRoute,
    navigateToEarnAssetAcquisitionRoute:
      mockNavigateToEarnAssetAcquisitionRoute,
  })),
}));

jest.mock('../utils/earnAssets', () => ({
  __esModule: true,
  earnAssetToToken: jest.fn(),
  getEarnInputExperiences: (
    experiences: readonly EarnExperience[],
  ): EarnExperience[] =>
    experiences.filter((experience) => experience.role !== 'output'),
  getReadyEarnDepositExperiences: (
    experiences: readonly EarnExperience[],
  ): EarnExperience[] =>
    experiences
      .filter((experience) => experience.role !== 'output')
      .filter((experience) => experience.depositReadiness.status === 'ready'),
  requiresEarnAssetAcquisition: (
    readiness: EarnExperience['depositReadiness'],
  ) =>
    readiness.status === 'not_ready' &&
    [
      'asset_not_tracked',
      'insufficient_balance',
      'balance_unavailable',
    ].includes(readiness.reason),
  getMoneyDepositPaymentToken: (earnAsset: EarnAsset) => {
    if (earnAsset.wallet.status !== 'tracked') {
      throw new Error('Expected tracked wallet asset');
    }

    if (!('address' in earnAsset.wallet.asset)) {
      throw new Error('Expected tracked EVM asset');
    }

    return {
      address: earnAsset.wallet.asset.address,
      chainId: earnAsset.wallet.asset.chainId,
    };
  },
  requireTrackedEarnAsset: (earnAsset: EarnAsset, operation: string) => {
    if (earnAsset.wallet.status === 'tracked') {
      return earnAsset.wallet.asset;
    }

    throw new Error(
      `${operation} requires wallet-tracked asset: ${earnAsset.assetId}`,
    );
  },
}));
jest.mock('../utils/analytics', () => ({
  formatChainIdForAnalytics: (chainId?: string | number) =>
    chainId === undefined ? undefined : String(chainId),
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
const mockUseEarnToasts = jest.fn();
jest.mock('./useEarnToasts', () => ({
  __esModule: true,
  default: () => mockUseEarnToasts(),
}));

const mockUseNavigation = jest.mocked(useNavigation);
const mockUseStakingChain = jest.mocked(useStakingChain);
const mockUseMoneyAccountDeposit = jest.mocked(useMoneyAccountDeposit);
const mockLoggerError = jest.mocked(Logger.error);
const mockEarnAssetToToken = jest.mocked(earnAssetToToken);
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
const showToast = jest.fn<void, [EarnToastOptions]>();
const navigationToDepositToast = {} as EarnToastOptions;

const createExperience = (
  type: EarnExperience['type'],
  id = `experience:${type}`,
  depositReadiness: EarnExperience['depositReadiness'] = {
    status: 'ready',
  },
): EarnExperience => ({
  id,
  type,
  role: 'underlying',
  depositReadiness,
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
): EarnAsset => {
  const decimals = 6;
  const balance = new BigNumber(fiatBalance);
  const rawBalance = balance.isZero()
    ? '0x0'
    : `0x${balance.shiftedBy(decimals).toString(16)}`;

  return {
    assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    metadata: {
      address: assetAddress,
      chainId: chainId ?? '0x1',
      decimals,
      image: 'usdc.png',
      name: 'USD Coin',
      symbol: 'USDC',
      logo: 'usdc.png',
      isETH: false,
      isNative: false,
    },
    wallet: {
      status: 'tracked',
      asset: {
        accountType: EthAccountType.Eoa,
        accountId: 'account-id',
        assetId: assetAddress,
        address: assetAddress,
        chainId,
        decimals,
        image: 'usdc.png',
        name: 'USD Coin',
        symbol: 'USDC',
        balance: balance.toString(),
        rawBalance,
        fiat: {
          balance: fiatBalance,
          currency: 'USD',
          conversionRate: 1,
        },
        isNative: false,
      } as Asset,
    },
    experiences,
  };
};

const createUntrackedEarnAsset = (
  experiences: readonly EarnExperience[] = [],
): EarnAsset => ({
  assetId: usdtAssetId,
  metadata: {
    address: usdtAddress,
    chainId: '0x1',
    decimals: 6,
    image: 'usdt.png',
    name: 'Tether USD',
    symbol: 'USDT',
    logo: 'usdt.png',
    isETH: false,
  },
  wallet: { status: 'untracked' },
  experiences,
});

describe('useEarnOpportunityNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveEarnAssetAcquisitionRoute.mockReset();
    mockNavigateToEarnAssetAcquisitionRoute.mockReset();
    mockNavigateToEarnAssetAcquisitionRoute.mockResolvedValue(undefined);
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as unknown as ReturnType<typeof useNavigation>);
    mockUseStakingChain.mockReturnValue({
      isStakingSupportedChain: true,
    });
    mockUseMoneyAccountDeposit.mockReturnValue({
      initiateDeposit: mockInitiateDeposit,
    });
    mockUseEarnToasts.mockReturnValue({
      showToast,
      EarnToastOptions: {
        earnStrategySelection: {
          navigationToDeposit: navigationToDepositToast,
        },
      },
    });
    mockEarnAssetToToken.mockImplementation((earnAsset: EarnAsset) => {
      if (earnAsset.wallet.status !== 'tracked') {
        throw new Error(
          `Earn token conversion requires wallet-tracked asset: ${earnAsset.assetId}`,
        );
      }

      const asset = earnAsset.wallet.asset;

      return {
        ...earnAsset.metadata,
        balance: asset.balance,
        balanceFiat: asset.fiat
          ? moneyFormatFiat(
              new BigNumber(asset.fiat.balance),
              asset.fiat.currency,
            )
          : undefined,
      } as TokenI;
    });
    mockEngineFindNetworkClientIdByChainId.mockReturnValue('network-client-id');
    mockEngineSetActiveNetwork.mockResolvedValue(undefined);
    mockEngineSetMultichainActiveNetwork.mockResolvedValue(undefined);
    mockInitiateDeposit.mockResolvedValue(undefined);
    mockRedirectToOnboardingIfNeeded.mockReturnValue(false);
  });

  it('resolves destinations for Money account deposit strategy', () => {
    const earnAsset = createEarnAsset(1, [
      createExperience('MONEY_ACCOUNT_DEPOSIT'),
    ]);

    expect(getEarnOpportunityDestination(earnAsset)).toBe(
      EARN_MODULE_REDIRECT_TARGETS.MONEY_DEPOSIT,
    );
    expect(getEarnAssetEntryRedirectTarget(earnAsset, true)).toBe(
      EARN_MODULE_REDIRECT_TARGETS.MONEY_ONBOARDING,
    );
    expect(getEarnAssetEntryRedirectTarget(earnAsset, false)).toBe(
      EARN_MODULE_REDIRECT_TARGETS.MONEY_DEPOSIT,
    );
  });

  it('resolves non-Money strategy destinations to Earn deposit', () => {
    expect(
      getEarnSelectedStrategyRedirectTarget(
        createExperience(EARN_EXPERIENCES.POOLED_STAKING),
        false,
      ),
    ).toBe(EARN_MODULE_REDIRECT_TARGETS.POOLED_STAKING_DEPOSIT);
  });

  it('ignores output experiences when resolving an opportunity destination', () => {
    const inputExperience = createExperience(
      EARN_EXPERIENCES.STABLECOIN_LENDING,
    );
    const outputExperience = {
      ...createExperience(EARN_EXPERIENCES.POOLED_STAKING),
      role: 'output' as const,
    };
    const earnAsset = createEarnAsset(1, [inputExperience, outputExperience]);

    const result = getEarnOpportunityDestination(earnAsset);

    expect(result).toBe(
      EARN_MODULE_REDIRECT_TARGETS.STABLECOIN_LENDING_DEPOSIT,
    );
  });

  it('throws when an asset has no eligible experiences', () => {
    const earnAsset = createEarnAsset(1, []);

    expect(() => getEarnOpportunityDestination(earnAsset)).toThrow(
      '[useEarnOpportunityNavigation] Earn asset has no eligible experiences',
    );
  });

  it('throws when an experience type is unsupported', () => {
    const earnAsset = createEarnAsset(1, [
      createExperience('UNSUPPORTED' as EarnExperience['type']),
    ]);

    expect(() => getEarnOpportunityDestination(earnAsset)).toThrow(
      '[useEarnOpportunityNavigation] Unsupported Earn experience: UNSUPPORTED',
    );
  });

  it('returns no redirect target when opportunity analytics data is invalid', () => {
    const earnAsset = createEarnAsset(1, []);

    expect(getEarnAssetEntryRedirectTarget(earnAsset, false)).toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          '[useEarnOpportunityNavigation] Earn asset has no eligible experiences',
      }),
      '[useEarnOpportunityNavigation] Failed to resolve Earn opportunity redirect target',
    );
  });

  it('returns no redirect target when experience analytics data is invalid', () => {
    const experience = createExperience(
      'UNSUPPORTED' as EarnExperience['type'],
    );

    expect(
      getEarnSelectedStrategyRedirectTarget(experience, false),
    ).toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          '[useEarnOpportunityNavigation] Unsupported Earn experience: UNSUPPORTED',
      }),
      '[useEarnOpportunityNavigation] Failed to resolve Earn experience redirect target',
    );
  });

  it.each([
    [
      EARN_EXPERIENCES.STABLECOIN_LENDING,
      EARN_MODULE_REDIRECT_TARGETS.STABLECOIN_LENDING_DEPOSIT,
    ],
    [
      EARN_EXPERIENCES.TRX_STAKING,
      EARN_MODULE_REDIRECT_TARGETS.TRX_STAKING_DEPOSIT,
    ],
  ] as const)(
    'resolves %s to its deposit destination',
    (experienceType, expectedDestination) => {
      const result = getEarnSelectedStrategyRedirectTarget(
        createExperience(experienceType),
        false,
      );

      expect(result).toBe(expectedDestination);
    },
  );

  it('does not navigate when the asset is undefined', () => {
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    act(() => {
      result.current.navigateFromEarnAsset(undefined as unknown as EarnAsset);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockEarnAssetToToken).not.toHaveBeenCalled();
  });

  it('shows a toast and logs when an asset has no eligible experiences', () => {
    const earnAsset = createEarnAsset(1, []);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    act(() => {
      result.current.navigateFromEarnAsset(earnAsset);
    });

    expect(showToast).toHaveBeenCalledWith(navigationToDepositToast);
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          '[useEarnOpportunityNavigation] Earn asset has no eligible experiences',
      }),
      '[useEarnOpportunityNavigation] Failed to resolve Earn opportunity destination',
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows a toast and logs when an asset has an unsupported experience', () => {
    const earnAsset = createEarnAsset(1, [
      createExperience('UNSUPPORTED' as EarnExperience['type']),
    ]);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    act(() => {
      result.current.navigateFromEarnAsset(earnAsset);
    });

    expect(showToast).toHaveBeenCalledWith(navigationToDepositToast);
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          '[useEarnOpportunityNavigation] Unsupported Earn experience: UNSUPPORTED',
      }),
      '[useEarnOpportunityNavigation] Failed to resolve Earn opportunity destination',
    );
    expect(mockNavigate).not.toHaveBeenCalled();
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

  it('passes analytics context to strategy selection', () => {
    const earnAsset = createEarnAsset(1, [
      createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING),
      createExperience(EARN_EXPERIENCES.POOLED_STAKING),
    ]);
    const analyticsContext = {
      entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE,
      screen_name: EARN_MODULE_SCREEN_NAMES.EARN_SECTION_LIST_VIEW,
      asset_position: 2,
      assets_in_list: 4,
    };
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    act(() => {
      result.current.navigateFromEarnAsset(
        earnAsset,
        undefined,
        analyticsContext,
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.EARN.MODALS.ROOT, {
      screen: Routes.EARN.MODALS.STRATEGY_SELECTION,
      params: { earnAsset, analyticsContext },
    });
  });

  it('navigates an unavailable asset to Token Details', async () => {
    const earnAsset = createEarnAsset(0, [
      createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING, 'lending:usdc', {
        status: 'not_ready',
        reason: 'insufficient_balance',
      }),
    ]);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      await result.current.navigateToDepositForExperience(
        earnAsset,
        earnAsset.experiences[0],
        TokenDetailsSource.ExploreEarn,
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      'Asset',
      expect.objectContaining({
        address: assetAddress,
        chainId: earnAsset.metadata.chainId,
        source: TokenDetailsSource.ExploreEarn,
      }),
    );
  });

  it('navigates an untracked unavailable asset through acquisition', async () => {
    const earnAsset = createUntrackedEarnAsset([
      createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING, 'lending:usdt', {
        status: 'not_ready',
        reason: 'asset_not_tracked',
      }),
    ]);
    const acquisitionRoute: EarnAssetAcquisitionRoute = {
      type: 'buy',
      assetId: usdtAssetId,
      redirectTarget: EARN_MODULE_REDIRECT_TARGETS.BUY,
    };
    mockResolveEarnAssetAcquisitionRoute.mockReturnValue(acquisitionRoute);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      await result.current.navigateToDepositForExperience(
        earnAsset,
        earnAsset.experiences[0],
        TokenDetailsSource.ExploreEarn,
      );
    });

    expect(mockResolveEarnAssetAcquisitionRoute).toHaveBeenCalledWith(
      earnAsset,
      earnAsset.experiences[0],
    );
    expect(mockNavigateToEarnAssetAcquisitionRoute).toHaveBeenCalledWith(
      acquisitionRoute,
    );
    expect(mockEarnAssetToToken).not.toHaveBeenCalled();
  });

  it('preserves a swap acquisition route for an untracked asset', async () => {
    const earnAsset = createUntrackedEarnAsset([
      createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING, 'lending:usdt', {
        status: 'not_ready',
        reason: 'asset_not_tracked',
      }),
    ]);
    const acquisitionRoute: EarnAssetAcquisitionRoute = {
      type: 'swap',
      sourceToken: {
        address: assetAddress,
        chainId: '0x1',
        decimals: 6,
        name: 'USD Coin',
        symbol: 'USDC',
        image: 'usdc.png',
      },
      destinationToken: {
        address: usdtAddress,
        chainId: '0x1',
        decimals: 6,
        name: 'Tether USD',
        symbol: 'USDT',
        image: 'usdt.png',
      },
      redirectTarget: EARN_MODULE_REDIRECT_TARGETS.SWAP,
    };
    mockResolveEarnAssetAcquisitionRoute.mockReturnValue(acquisitionRoute);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      await result.current.navigateToDepositForExperience(
        earnAsset,
        earnAsset.experiences[0],
      );
    });

    expect(mockNavigateToEarnAssetAcquisitionRoute).toHaveBeenCalledWith(
      acquisitionRoute,
    );
    expect(mockEarnAssetToToken).not.toHaveBeenCalled();
  });

  it('surfaces non-rejection errors from fiat Money deposit setup', async () => {
    const error = new Error('Fiat deposit unavailable');
    mockInitiateDeposit.mockRejectedValue(error);
    const earnAsset = createUntrackedEarnAsset();
    const experience = {
      ...createExperience('MONEY_ACCOUNT_DEPOSIT'),
      depositReadiness: {
        status: 'not_ready' as const,
        reason: 'asset_not_tracked' as const,
      },
    };
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await expect(
      result.current.navigateToDepositForExperience(earnAsset, experience),
    ).rejects.toThrow('Fiat deposit unavailable');

    expect(showToast).not.toHaveBeenCalled();
  });

  it('starts a Money deposit for a tracked asset with one Money experience', async () => {
    const earnAsset = createEarnAsset(1, [
      createExperience('MONEY_ACCOUNT_DEPOSIT'),
    ]);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      result.current.navigateFromEarnAsset(earnAsset);
    });

    await waitFor(() => expect(mockInitiateDeposit).toHaveBeenCalled());

    const preferredPaymentToken = {
      address: assetAddress,
      chainId: '0x1',
    };
    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      preferredPaymentToken,
      intent: 'convert',
      onDepositSetupFailure: expect.any(Function),
    });
  });

  it('redirects a tracked Money deposit to onboarding', async () => {
    const earnAsset = createEarnAsset(1, [
      createExperience('MONEY_ACCOUNT_DEPOSIT'),
    ]);
    mockRedirectToOnboardingIfNeeded.mockReturnValue(true);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      await result.current.navigateToDepositForExperience(
        earnAsset,
        earnAsset.experiences[0],
      );
    });

    expect(mockRedirectToOnboardingIfNeeded).toHaveBeenCalledWith({
      postOnboardingRedirect: {
        type: MoneyPostOnboardingRedirectType.DEPOSIT,
        preferredPaymentToken: {
          address: assetAddress,
          chainId: '0x1',
        },
      },
    });
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  it('starts a fiat Money deposit for an untracked Money experience', async () => {
    const earnAsset = createUntrackedEarnAsset();
    const experience = {
      ...createExperience('MONEY_ACCOUNT_DEPOSIT'),
      depositReadiness: {
        status: 'not_ready' as const,
        reason: 'asset_not_tracked' as const,
      },
    };
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      await result.current.navigateToDepositForExperience(
        earnAsset,
        experience,
      );
    });

    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      autoSelectFiatPayment: true,
      intent: 'card',
      onDepositSetupFailure: expect.any(Function),
    });
  });

  it('does not show an Earn navigation error when an untracked Money deposit is rejected', async () => {
    mockInitiateDeposit.mockRejectedValue(
      new Error('User rejected the request'),
    );
    const earnAsset = createUntrackedEarnAsset();
    const experience = {
      ...createExperience('MONEY_ACCOUNT_DEPOSIT'),
      depositReadiness: {
        status: 'not_ready' as const,
        reason: 'asset_not_tracked' as const,
      },
    };
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      await result.current.navigateToDepositForExperience(
        earnAsset,
        experience,
      );
    });

    expect(showToast).not.toHaveBeenCalled();
  });

  it('rejects when an untracked asset is passed directly to deposit navigation', async () => {
    const earnAsset = createUntrackedEarnAsset([
      createExperience(EARN_EXPERIENCES.TRX_STAKING),
    ]);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await expect(
      result.current.navigateToDepositForExperience(
        earnAsset,
        earnAsset.experiences[0],
      ),
    ).rejects.toThrow(
      '[useEarnOpportunityNavigation] Deposit redirect requires wallet-tracked asset',
    );
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
    });

    await waitFor(() => expect(mockLoggerError).toHaveBeenCalled());

    expect(mockLoggerError).toHaveBeenCalledWith(
      error,
      '[useEarnOpportunityNavigation] Failed to initiate Money deposit',
    );
    expect(showToast).not.toHaveBeenCalled();
  });

  it('shows an Earn toast when Money deposit setup fails', async () => {
    const error = new Error('Money deposit setup failed');
    mockInitiateDeposit.mockImplementationOnce(
      async ({ onDepositSetupFailure }) => {
        onDepositSetupFailure?.(error);
        throw error;
      },
    );
    const earnAsset = createEarnAsset(1, [
      createExperience('MONEY_ACCOUNT_DEPOSIT'),
    ]);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      result.current.navigateFromEarnAsset(earnAsset);
    });

    await waitFor(() => expect(showToast).toHaveBeenCalled());

    expect(showToast).toHaveBeenCalledWith(navigationToDepositToast);
    expect(mockLoggerError).toHaveBeenCalledWith(
      error,
      '[useEarnOpportunityNavigation] Failed to initiate Money deposit',
    );
  });

  it('switches network and navigates to staking for stablecoin lending', async () => {
    const earnAsset = createEarnAsset(1, [
      createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING),
    ]);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      result.current.navigateFromEarnAsset(earnAsset);
    });

    await waitFor(() => expect(mockEngineSetActiveNetwork).toHaveBeenCalled());

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
    expect(mockEngineSetActiveNetwork.mock.invocationCallOrder[0]).toBeLessThan(
      mockNavigate.mock.invocationCallOrder[0],
    );
  });

  it('logs and stops stablecoin lending navigation without a network client', async () => {
    mockEngineFindNetworkClientIdByChainId.mockReturnValue(undefined);
    const earnAsset = createEarnAsset(1, [
      createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING),
    ]);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      result.current.navigateFromEarnAsset(earnAsset);
    });

    await waitFor(() => expect(mockLoggerError).toHaveBeenCalled());

    expect(mockLoggerError).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        message:
          'Stablecoin lending redirect failed: could not retrieve networkClientId for chainId: 0x1',
      }),
    );
    expect(showToast).toHaveBeenCalledWith(navigationToDepositToast);
    expect(mockEngineSetActiveNetwork).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to staking for pooled staking on a supported chain', async () => {
    const earnAsset = createEarnAsset(1, [
      createExperience(EARN_EXPERIENCES.POOLED_STAKING),
    ]);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      result.current.navigateFromEarnAsset(earnAsset);
    });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());

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
    });

    await waitFor(() =>
      expect(mockEngineSetMultichainActiveNetwork).toHaveBeenCalled(),
    );

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
    expect(
      mockEngineSetMultichainActiveNetwork.mock.invocationCallOrder[0],
    ).toBeLessThan(mockNavigate.mock.invocationCallOrder[0]);
  });

  it('navigates to staking for TRX staking', async () => {
    const earnAsset = createEarnAsset(1, [
      createExperience(EARN_EXPERIENCES.TRX_STAKING),
    ]);
    const { result } = renderHook(() => useEarnOpportunityNavigation());

    await act(async () => {
      result.current.navigateFromEarnAsset(earnAsset);
    });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());

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
