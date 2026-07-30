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
import { MoneyPostOnboardingRedirectType } from '../types/navigation';
import { useMoneyAccountDeposit } from './useMoneyAccount';
import useMoneyAccountBalance from './useMoneyAccountBalance';
import { useMoneyAnalytics } from './useMoneyAnalytics';
import { useMoneyAssetOverviewCtas } from './useMoneyAssetOverviewCtas';
import { useMoneyCtaVisibility } from './useMoneyCtaVisibility';
import { useMoneyOnboardingNavigation } from './useMoneyNavigation';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));
jest.mock('./useMoneyAccount');
jest.mock('./useMoneyAccountBalance');
jest.mock('./useMoneyAnalytics');
jest.mock('./useMoneyCtaVisibility');
jest.mock('./useMoneyNavigation');

const mockInitiateDeposit = jest.fn();
const mockRedirectToOnboardingIfNeeded = jest.fn();
const mockTrackTokenButtonClicked = jest.fn();
const mockShouldShowMoneyAssetOverviewBalanceCta = jest.fn();
const mockShouldShowMoneyAssetOverviewFooterCta = jest.fn();

const mockUseMoneyAccountDeposit = jest.mocked(useMoneyAccountDeposit);
const mockUseMoneyAccountBalance = jest.mocked(useMoneyAccountBalance);
const mockUseMoneyAnalytics = jest.mocked(useMoneyAnalytics);
const mockUseMoneyCtaVisibility = jest.mocked(useMoneyCtaVisibility);
const mockUseMoneyOnboardingNavigation = jest.mocked(
  useMoneyOnboardingNavigation,
);

const asset = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1',
  symbol: 'USDC',
  balance: '1',
} as TokenI;

describe('useMoneyAssetOverviewCtas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitiateDeposit.mockResolvedValue(undefined);
    mockRedirectToOnboardingIfNeeded.mockReturnValue(false);
    mockShouldShowMoneyAssetOverviewBalanceCta.mockReturnValue(true);
    mockShouldShowMoneyAssetOverviewFooterCta.mockReturnValue(true);
    mockUseMoneyAccountDeposit.mockReturnValue({
      initiateDeposit: mockInitiateDeposit,
    });
    mockUseMoneyAccountBalance.mockReturnValue({
      apyDecimal: 0.04,
      apyPercent: 4,
      vaultApyQuery: { isLoading: false },
    } as ReturnType<typeof useMoneyAccountBalance>);
    mockUseMoneyAnalytics.mockReturnValue({
      trackTokenButtonClicked: mockTrackTokenButtonClicked,
    } as unknown as ReturnType<typeof useMoneyAnalytics>);
    mockUseMoneyCtaVisibility.mockReturnValue({
      shouldShowMoneyAssetOverviewBalanceCta:
        mockShouldShowMoneyAssetOverviewBalanceCta,
      shouldShowMoneyAssetOverviewFooterCta:
        mockShouldShowMoneyAssetOverviewFooterCta,
      shouldShowMoneyTokenListItemCta: jest.fn(),
      shouldShowMoneyEarnBanner: jest.fn(),
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
    mockUseMoneyAccountBalance.mockReturnValue({
      apyDecimal: undefined,
      apyPercent: undefined,
      vaultApyQuery: { isLoading: false },
    } as ReturnType<typeof useMoneyAccountBalance>);
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
