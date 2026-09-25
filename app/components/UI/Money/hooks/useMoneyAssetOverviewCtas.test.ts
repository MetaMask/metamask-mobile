import { act, renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import type { Hex } from '@metamask/utils';
import type { TokenI } from '../../Tokens/types';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import { earnSelectors } from '../../../../selectors/earnController/earn';
import { selectRelayFixedSpread } from '../../../../selectors/featureFlagController/confirmations';
import type { RootState } from '../../../../reducers';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../constants/moneyEvents';
import { MoneyPostOnboardingRedirectType } from '../types/navigation';
import type { RelayFixedSpreadConfig } from '../../../Views/confirmations/utils/relayFixedSpread';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import { useMoneyAccountDeposit } from './useMoneyAccount';
import useMoneyVaultApy from './useMoneyVaultApy';
import { useMoneyAnalytics } from './useMoneyAnalytics';
import { useMoneyAssetOverviewCtas } from './useMoneyAssetOverviewCtas';
import { useMoneyAssetOverviewCtaVisibility } from './useMoneyCtaVisibility';
import { useMoneyOnboardingNavigation } from './useMoneyNavigation';
import { buildEvmCaip19AssetId } from '../../../../util/multichain/buildEvmCaip19AssetId';

jest.mock('../../../../selectors/earnController/earn', () => ({
  earnSelectors: {
    selectIsAaveOutputToken: jest.fn(),
  },
}));
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));
jest.mock('./useMoneyAccount');
jest.mock('./useMoneyVaultApy');
jest.mock('./useMoneyAnalytics');
jest.mock('./useMoneyCtaVisibility');
jest.mock('./useMoneyNavigation');
jest.mock('react-redux');

const mockInitiateDeposit = jest.fn();
const mockRedirectToOnboardingIfNeeded = jest.fn();
const mockTrackTokenButtonClicked = jest.fn();
const mockUseSelector = jest.mocked(useSelector);
const mockUseMoneyAccountDeposit = jest.mocked(useMoneyAccountDeposit);
const mockUseMoneyVaultApy = jest.mocked(useMoneyVaultApy);
const mockUseMoneyAnalytics = jest.mocked(useMoneyAnalytics);
const mockUseMoneyAssetOverviewCtaVisibility = jest.mocked(
  useMoneyAssetOverviewCtaVisibility,
);
const mockUseMoneyOnboardingNavigation = jest.mocked(
  useMoneyOnboardingNavigation,
);
const mockSelectIsAaveOutputToken = jest.mocked(
  earnSelectors.selectIsAaveOutputToken,
);
const mockSelectorState = {} as RootState;

const RELAY_CONFIG_WITH_SUBSIDIZED_AUSDC: RelayFixedSpreadConfig = {
  routes: [
    {
      sourceChain: '0x1',
      sourceToken: '0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c',
      targetChain: '0x8f',
      targetToken: MUSD_TOKEN_ADDRESS,
    },
    {
      sourceChain: '0x1',
      sourceToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      targetChain: '0x8f',
      targetToken: MUSD_TOKEN_ADDRESS,
    },
  ],
};

const EMPTY_RELAY_CONFIG: RelayFixedSpreadConfig = { routes: [] };

const asset = {
  address: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',
  chainId: '0x1',
  symbol: 'aUSDC',
  balance: '1',
} as TokenI;

const setupSelectors = (
  relayFixedSpread: RelayFixedSpreadConfig = RELAY_CONFIG_WITH_SUBSIDIZED_AUSDC,
  isAaveOutputToken = true,
) => {
  mockSelectIsAaveOutputToken.mockReturnValue(isAaveOutputToken);
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRelayFixedSpread) {
      return relayFixedSpread;
    }

    return selector(mockSelectorState);
  });
};

describe('useMoneyAssetOverviewCtas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSelectors();
    mockInitiateDeposit.mockResolvedValue(undefined);
    mockRedirectToOnboardingIfNeeded.mockReturnValue(false);
    mockUseMoneyAccountDeposit.mockReturnValue({
      initiateDeposit: mockInitiateDeposit,
    });
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
    mockUseMoneyOnboardingNavigation.mockReturnValue({
      isOnboardingRedirectNeeded: false,
      redirectToOnboardingIfNeeded: mockRedirectToOnboardingIfNeeded,
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

  it('shows the footer CTA for an aToken with a subsidized Money deposit route', () => {
    const { result } = renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset,
        balanceFiatUsd: 100,
        hasBalance: true,
      }),
    );

    expect(result.current.isFooterCtaVisible).toBe(true);
  });

  it('hides the footer CTA for an aToken without a subsidized Money deposit route', () => {
    setupSelectors(EMPTY_RELAY_CONFIG);

    const { result } = renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset,
        balanceFiatUsd: 100,
        hasBalance: true,
      }),
    );

    expect(result.current.isFooterCtaVisible).toBe(false);
  });

  it('hides the footer CTA when the Earn selector excludes the asset', () => {
    setupSelectors(RELAY_CONFIG_WITH_SUBSIDIZED_AUSDC, false);

    const { result } = renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset: {
          ...asset,
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'aUSDC',
        },
        balanceFiatUsd: 100,
        hasBalance: true,
      }),
    );

    expect(result.current.isFooterCtaVisible).toBe(false);
  });

  it('keeps the balance CTA visible when the footer route is not subsidized', () => {
    setupSelectors(EMPTY_RELAY_CONFIG);

    const { result } = renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset,
        balanceFiatUsd: 100,
        hasBalance: true,
      }),
    );

    expect(result.current.isBalanceCtaVisible).toBe(true);
    expect(result.current.isFooterCtaVisible).toBe(false);
  });

  it('passes the normalized asset ID to the Earn output-token selector', () => {
    renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset,
        balanceFiatUsd: 100,
        hasBalance: true,
      }),
    );

    const expectedAssetId = buildEvmCaip19AssetId(
      asset.address,
      asset.chainId as Hex,
    );

    expect(mockSelectIsAaveOutputToken).toHaveBeenCalledWith(
      mockSelectorState,
      expectedAssetId,
    );
  });

  it('disables the footer APY query when the asset ID cannot be built', () => {
    mockUseMoneyAssetOverviewCtaVisibility.mockReturnValue({
      isBalanceCtaEligible: false,
      isFooterCtaEligible: true,
    });
    setupSelectors(RELAY_CONFIG_WITH_SUBSIDIZED_AUSDC, false);

    const { result } = renderHook(() =>
      useMoneyAssetOverviewCtas({
        asset: {
          ...asset,
          chainId: 'tron:728126428',
        },
        balanceFiatUsd: 100,
        hasBalance: true,
      }),
    );

    expect(mockUseMoneyVaultApy).toHaveBeenCalledWith({ enabled: false });
    expect(result.current.isFooterCtaVisible).toBe(false);
    expect(mockSelectIsAaveOutputToken).toHaveBeenCalledWith(
      mockSelectorState,
      undefined,
    );
  });

  it('tracks footer onboarding with interpolated labels and token context', async () => {
    mockRedirectToOnboardingIfNeeded.mockReturnValue(true);
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
    mockRedirectToOnboardingIfNeeded.mockReturnValue(true);
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

    expect(mockRedirectToOnboardingIfNeeded).toHaveBeenCalledWith({
      postOnboardingRedirect: {
        type: MoneyPostOnboardingRedirectType.DEPOSIT,
        preferredPaymentToken: {
          address: asset.address,
          chainId: asset.chainId,
        },
      },
    });
  });
});
