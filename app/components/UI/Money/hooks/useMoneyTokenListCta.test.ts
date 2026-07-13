import { act, renderHook } from '@testing-library/react-hooks';
import { toHex } from '@metamask/controller-utils';
import { TextColor } from '@metamask/design-system-react-native';
import type { TokenI } from '../../Tokens/types';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../constants/moneyEvents';
import { useMoneyAccountDeposit } from './useMoneyAccount';
import useMoneyAccountBalance from './useMoneyAccountBalance';
import { useMoneyAnalytics } from './useMoneyAnalytics';
import { useMoneyCtaVisibility } from './useMoneyCtaVisibility';
import { useMoneyOnboardingNavigation } from './useMoneyNavigation';
import { MoneyPostOnboardingRedirectType } from '../types/navigation';
import { useMoneyTokenListCta } from './useMoneyTokenListCta';

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
const mockTrackButtonClicked = jest.fn();
const mockShouldShowMoneyTokenListItemCta = jest.fn();

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
} as TokenI;

describe('useMoneyTokenListCta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitiateDeposit.mockResolvedValue(undefined);
    mockRedirectToOnboardingIfNeeded.mockReturnValue(false);
    mockShouldShowMoneyTokenListItemCta.mockReturnValue(true);
    mockUseMoneyAccountDeposit.mockReturnValue({
      initiateDeposit: mockInitiateDeposit,
    });
    mockUseMoneyAccountBalance.mockReturnValue({
      apyPercent: 4,
    } as ReturnType<typeof useMoneyAccountBalance>);
    mockUseMoneyAnalytics.mockReturnValue({
      trackButtonClicked: mockTrackButtonClicked,
    } as unknown as ReturnType<typeof useMoneyAnalytics>);
    mockUseMoneyCtaVisibility.mockReturnValue({
      shouldShowMoneyTokenListItemCta: mockShouldShowMoneyTokenListItemCta,
    });
    mockUseMoneyOnboardingNavigation.mockReturnValue({
      redirectToOnboardingIfNeeded: mockRedirectToOnboardingIfNeeded,
    });
  });

  it('returns undefined when APY is unavailable', () => {
    mockUseMoneyAccountBalance.mockReturnValue({
      apyPercent: undefined,
    } as ReturnType<typeof useMoneyAccountBalance>);

    const { result } = renderHook(() => useMoneyTokenListCta());

    expect(result.current.tokenListItemCta).toBeUndefined();
  });

  it('returns CTA with localized APY label', () => {
    const { result } = renderHook(() => useMoneyTokenListCta());

    expect(result.current.tokenListItemCta).toEqual(
      expect.objectContaining({
        label: strings('money.token_list_cta.get_apy', { apy: 4 }),
        color: TextColor.SuccessDefault,
        shouldShow: mockShouldShowMoneyTokenListItemCta,
      }),
    );
  });

  it('initializes Money analytics for token-list CTA', () => {
    renderHook(() => useMoneyTokenListCta());

    expect(mockUseMoneyAnalytics).toHaveBeenCalledWith({
      screen_name: SCREEN_NAMES.WALLET_HOME,
      component_name: COMPONENT_NAMES.MONEY_TOKEN_LIST_ITEM_CTA,
    });
  });

  it('logs error without starting deposit when asset address is absent', async () => {
    const { result } = renderHook(() => useMoneyTokenListCta());

    await act(async () => {
      await result.current.tokenListItemCta?.onPress({
        ...asset,
        address: '',
      } as TokenI);
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      '[Money Account] Failed to initiate deposit from token list CTA',
    );
    expect(mockTrackButtonClicked).not.toHaveBeenCalled();
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  it('redirects new users to onboarding without starting deposit', async () => {
    mockRedirectToOnboardingIfNeeded.mockReturnValue(true);
    const { result } = renderHook(() => useMoneyTokenListCta());
    const preferredPaymentToken = {
      address: toHex(asset.address),
      chainId: asset.chainId,
    };

    await act(async () => {
      await result.current.tokenListItemCta?.onPress(asset);
    });

    expect(mockRedirectToOnboardingIfNeeded).toHaveBeenCalledWith({
      postOnboardingRedirect: {
        type: MoneyPostOnboardingRedirectType.DEPOSIT,
        preferredPaymentToken,
      },
    });
    expect(mockTrackButtonClicked).toHaveBeenCalledWith({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
      label_en: strings('money.token_list_cta.get_apy', { apy: 4 }),
      label_localized: strings('money.token_list_cta.get_apy', { apy: 4 }),
      redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
    });
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  it('initiates deposit for users who completed onboarding', async () => {
    const { result } = renderHook(() => useMoneyTokenListCta());
    const preferredPaymentToken = {
      address: toHex(asset.address),
      chainId: asset.chainId,
    };

    await act(async () => {
      await result.current.tokenListItemCta?.onPress(asset);
    });

    expect(mockTrackButtonClicked).toHaveBeenCalledWith({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
      label_en: strings('money.token_list_cta.get_apy', { apy: 4 }),
      label_localized: strings('money.token_list_cta.get_apy', { apy: 4 }),
      redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
    });
    expect(mockInitiateDeposit).toHaveBeenCalledWith({ preferredPaymentToken });
  });

  it('logs rejected deposits', async () => {
    const error = new Error('deposit failed');
    mockInitiateDeposit.mockRejectedValue(error);
    const { result } = renderHook(() => useMoneyTokenListCta());

    await act(async () => {
      await result.current.tokenListItemCta?.onPress(asset);
    });

    expect(Logger.error).toHaveBeenCalledWith(
      error,
      '[Money Account] Failed to initiate deposit from token list CTA',
    );
  });
});
