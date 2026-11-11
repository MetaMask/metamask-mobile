import { act, renderHook } from '@testing-library/react-hooks';
import type { TokenI } from '../../Tokens/types';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../constants/moneyEvents';
import useMoneyVaultApy from './useMoneyVaultApy';
import { useMoneyAnalytics } from './useMoneyAnalytics';
import { useMoneyAssetOverviewCtas } from './useMoneyAssetOverviewCtas';
import { useMoneyAssetOverviewCtaVisibility } from './useMoneyCtaVisibility';
import { useMoneyCtaDepositNavigation } from './useMoneyDepositNavigation';
import { buildEvmCaip19AssetId } from '../../../../util/multichain/buildEvmCaip19AssetId';
import { useMoneyDepositNavigation } from './useMoneyNavigation';
import { useABTest } from '../../../../hooks/useABTest';
import {
  EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_AB_KEY,
  EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_EXPOSURE_METADATA,
  EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_VARIANTS,
} from '../../TokenDetails/components/abTestConfig';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));
jest.mock('./useMoneyVaultApy');
jest.mock('./useMoneyAnalytics');
jest.mock('./useMoneyCtaVisibility');
jest.mock('./useMoneyDepositNavigation');
jest.mock('react-redux');
jest.mock('./useMoneyNavigation');
jest.mock('../../../../hooks/useABTest');

const mockInitiateDeposit = jest.fn();
const mockNavigateToMoneyDeposit = jest.fn();
const mockTrackTokenButtonClicked = jest.fn();
const mockUseMoneyVaultApy = jest.mocked(useMoneyVaultApy);
const mockUseMoneyAnalytics = jest.mocked(useMoneyAnalytics);
const mockUseMoneyAssetOverviewCtaVisibility = jest.mocked(
  useMoneyAssetOverviewCtaVisibility,
);
const mockUseMoneyDepositNavigation = jest.mocked(useMoneyCtaDepositNavigation);
const mockSelectIsAaveOutputToken = jest.mocked(
  earnSelectors.selectIsAaveOutputToken,
);
const mockSelectorState = {} as RootState;

const mockUseMoneyDepositNavigation = jest.mocked(useMoneyDepositNavigation);
const mockUseABTest = jest.mocked(useABTest);

const asset = {
  address: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',
  chainId: '0x1',
  symbol: 'aUSDC',
  balance: '1',
} as TokenI;

describe('useMoneyAssetOverviewCtas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitiateDeposit.mockResolvedValue(undefined);
    mockUseMoneyDepositNavigation.mockReturnValue({
      navigateToMoneyDeposit: mockNavigateToMoneyDeposit,
    });
    mockNavigateToMoneyDeposit.mockImplementation(
      async ({ track, ...options }) => {
        track?.({
          button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
          redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
        });
        await mockInitiateDeposit(options);
      },
    );
    mockUseMoneyVaultApy.mockReturnValue({
      apyDecimal: 0.04,
      apyPercent: 4,
      vaultApyQuery: { isLoading: false },
    } as ReturnType<typeof useMoneyVaultApy>);
    mockUseMoneyAnalytics.mockReturnValue({
      trackTokenButtonClicked: mockTrackTokenButtonClicked,
    } as unknown as ReturnType<typeof useMoneyAnalytics>);
    mockUseMoneyAssetOverviewCtaVisibility.mockReturnValue({
      isBalanceCtaEligible: true,
      isFooterCtaEligible: true,
    });
  });

  it('initializes shared analytics for the Asset Overview screen', () => {
    renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset,
        balanceFiatUsd: 100,
        hasBalance: true,
      }),
    );

    expect(mockUseMoneyAnalytics).toHaveBeenCalledTimes(1);
    expect(mockUseMoneyAnalytics).toHaveBeenCalledWith({
      screen_name: SCREEN_NAMES.ASSET_DETAIL,
    });
    expect(mockUseMoneyVaultApy).toHaveBeenCalledWith({ enabled: true });
  });

  it('skips the vault APY query when neither Asset Overview CTA is eligible', () => {
    mockUseMoneyAssetOverviewCtaVisibility.mockReturnValue({
      isBalanceCtaEligible: false,
      isFooterCtaEligible: false,
    });

    renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset,
        balanceFiatUsd: 100,
        hasBalance: true,
      }),
    );

    expect(mockUseMoneyVaultApy).toHaveBeenCalledWith({ enabled: false });
  });

  it('tracks experiment exposure for eligible control users without fetching APY', () => {
    mockUseMoneyAssetOverviewCtaVisibility.mockReturnValue({
      isBalanceCtaEligible: false,
      isFooterCtaEligible: false,
    });

    renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset,
        balanceFiatUsd: 100,
        hasBalance: true,
      }),
    );

    expect(mockUseMoneyVaultApy).toHaveBeenCalledWith({ enabled: false });
  });

  it('shows balance CTA loading when eligible', () => {
    mockUseMoneyVaultApy.mockReturnValue({
      apyDecimal: undefined,
      apyPercent: undefined,
      vaultApyQuery: { isLoading: true },
    } as ReturnType<typeof useMoneyVaultApy>);

    const { result } = renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset,
        balanceFiatUsd: 100,
        hasBalance: true,
      }),
    );

    expect(result.current.isBalanceCtaLoading).toBe(true);
    expect(result.current.isBalanceCtaVisible).toBe(false);
  });

  it('hides the eligible balance CTA when the APY query settles without data', () => {
    mockUseMoneyVaultApy.mockReturnValue({
      apyDecimal: undefined,
      apyPercent: undefined,
      vaultApyQuery: { isLoading: false },
    } as ReturnType<typeof useMoneyVaultApy>);

    const { result } = renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset,
        balanceFiatUsd: 100,
        hasBalance: true,
      }),
    );

    expect(result.current.isBalanceCtaLoading).toBe(false);
    expect(result.current.isBalanceCtaVisible).toBe(false);
  });

  it('shows the footer CTA for an aToken', () => {
    const { result } = renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset,
        balanceFiatUsd: 100,
        hasBalance: true,
      }),
    );

    expect(result.current.isFooterCtaVisible).toBe(true);
  });

  it('shows the footer CTA for an allowlisted stablecoin', () => {
    const { result } = renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset: {
          ...asset,
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
        },
        balanceFiatUsd: 100,
        hasBalance: true,
      }),
    );

    expect(result.current.isFooterCtaVisible).toBe(true);
  });

  it('hides the footer CTA for a stablecoin in the control variant', () => {
    mockUseABTest.mockImplementation((flagKey) => {
      if (flagKey === EARN_MONEY_DEPOSIT_BALANCE_CTA_VISIBILITY_AB_KEY) {
        return {
          variant: { showMoneyDepositBalanceCta: true },
          variantName: 'treatment',
          isActive: true,
        };
      }

      return {
        variant: { showMoneyDepositFooterCta: false },
        variantName: 'control',
        isActive: true,
      };
    });

    const { result } = renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset: {
          ...asset,
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
        },
        balanceFiatUsd: 100,
        hasBalance: true,
      }),
    );

    expect(result.current.isFooterCtaVisible).toBe(false);
    expect(mockUseABTest).toHaveBeenCalledWith(
      EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_AB_KEY,
      EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_VARIANTS,
      {
        ...EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_EXPOSURE_METADATA,
        trackExposure: true,
      },
    );
  });

  it('does not expose ineligible stablecoins to the footer experiment', () => {
    mockUseMoneyAssetOverviewCtaVisibility.mockReturnValue({
      isBalanceCtaEligible: false,
      isFooterCtaEligible: false,
    });

    const { result } = renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset: {
          ...asset,
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
        },
        balanceFiatUsd: 0,
        hasBalance: false,
      }),
    );

    expect(result.current.isFooterCtaVisible).toBe(false);
    expect(mockUseABTest).toHaveBeenCalledWith(
      EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_AB_KEY,
      EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_VARIANTS,
      {
        ...EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_EXPOSURE_METADATA,
        trackExposure: false,
      },
    );
  });

  it('shows an allowlisted aToken in the stablecoin control variant', () => {
    mockUseABTest.mockImplementation((flagKey) => {
      if (flagKey === EARN_MONEY_DEPOSIT_BALANCE_CTA_VISIBILITY_AB_KEY) {
        return {
          variant: { showMoneyDepositBalanceCta: true },
          variantName: 'treatment',
          isActive: true,
        };
      }

      return {
        variant: { showMoneyDepositFooterCta: false },
        variantName: 'control',
        isActive: true,
      };
    });

    const { result } = renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset,
        balanceFiatUsd: 100,
        hasBalance: true,
      }),
    );

    expect(result.current.isFooterCtaVisible).toBe(true);
    expect(mockUseABTest).toHaveBeenCalledWith(
      EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_AB_KEY,
      EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_VARIANTS,
      {
        ...EARN_MONEY_DEPOSIT_STABLECOIN_FOOTER_CTA_VISIBILITY_EXPOSURE_METADATA,
        trackExposure: false,
      },
    );
  });

  it('tracks footer onboarding with interpolated labels and token context', async () => {
    mockNavigateToMoneyDeposit.mockImplementationOnce(async ({ track }) => {
      track?.({
        button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
        redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
      });
    });
    const { result } = renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset,
        balanceFiatUsd: 100,
        hasBalance: true,
      }),
    );

    await act(async () => {
      await result.current.onFooterPress();
    });

    expect(mockTrackTokenButtonClicked).toHaveBeenCalledWith({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
      component_name: COMPONENT_NAMES.MONEY_ASSET_OVERVIEW_FOOTER_CTA,
      label_en: strings('money.asset_overview.cta.earn_apy', {
        apy: 4,
        locale: 'en',
      }),
      label_localized: strings('money.asset_overview.cta.earn_apy', { apy: 4 }),
      redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
      token_symbol: asset.symbol,
      token_position_in_list: 1,
      token_chain_id: asset.chainId,
      tokens_in_list: 1,
      token_has_balance: true,
    });
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  it('tracks balance CTA deposit with a static label key and token context', async () => {
    const { result } = renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset,
        balanceFiatUsd: 100,
        hasBalance: true,
      }),
    );

    await act(async () => {
      await result.current.onBalancePress();
    });

    expect(mockTrackTokenButtonClicked).toHaveBeenCalledWith({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
      component_name: COMPONENT_NAMES.MONEY_ASSET_OVERVIEW_BALANCE_CTA,
      label_key: 'money.asset_overview.cta.start_earning',
      redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
      token_symbol: asset.symbol,
      token_position_in_list: 1,
      token_chain_id: asset.chainId,
      tokens_in_list: 1,
      token_has_balance: true,
    });
    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      preferredPaymentToken: {
        address: asset.address,
        chainId: asset.chainId,
      },
    });
  });

  it('tracks zero balance for the footer CTA', async () => {
    const { result } = renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset: { ...asset, balance: '0' },
        balanceFiatUsd: 0,
        hasBalance: false,
      }),
    );

    await act(async () => {
      await result.current.onFooterPress();
    });

    expect(mockTrackTokenButtonClicked).toHaveBeenCalledWith(
      expect.objectContaining({ token_has_balance: false }),
    );
  });

  it('does not track or deposit when the footer APY label is unavailable', async () => {
    mockUseMoneyVaultApy.mockReturnValue({
      apyDecimal: undefined,
      apyPercent: undefined,
      vaultApyQuery: { isLoading: false },
    } as ReturnType<typeof useMoneyVaultApy>);
    const { result } = renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset,
        balanceFiatUsd: 100,
        hasBalance: true,
      }),
    );

    await act(async () => {
      await result.current.onFooterPress();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      '[Money Account] Failed to initiate deposit from Asset Overview CTA',
    );
    expect(mockTrackTokenButtonClicked).not.toHaveBeenCalled();
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  it('sends the selected asset to onboarding before tracking footer navigation', async () => {
    mockNavigateToMoneyDeposit.mockImplementationOnce(async ({ track }) => {
      track?.({
        button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
        redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
      });
    });
    const { result } = renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset,
        balanceFiatUsd: 100,
        hasBalance: true,
      }),
    );

    await act(async () => {
      await result.current.onFooterPress();
    });

    expect(mockNavigateToMoneyDeposit).toHaveBeenCalledWith({
      preferredPaymentToken: {
        address: asset.address,
        chainId: asset.chainId,
      },
      track: expect.any(Function),
    });
  });
});
