import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useDispatch } from 'react-redux';
import MoneyEarnBanner from './MoneyEarnBanner';
import { MoneyEarnBannerTestIds } from './MoneyEarnBanner.testIds';
import { strings } from '../../../../../../locales/i18n';
import { setMoneyEarnBannerDismissed } from '../../../../../actions/user';
import Logger from '../../../../../util/Logger';
import { MUSD_TOKEN_ADDRESS } from '../../../Earn/constants/musd';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { useMoneyCtaVisibility } from '../../hooks/useMoneyCtaVisibility';
import { useMoneyOnboardingNavigation } from '../../hooks/useMoneyNavigation';
import { TokenI } from '../../../Tokens/types';
import { MoneyPostOnboardingRedirectType } from '../../types/navigation';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

const mockDispatch = jest.fn();
const mockInitiateDeposit = jest.fn();
const mockUseMoneyAccountBalance = jest.fn();
const mockRedirectToOnboardingIfNeeded = jest.fn();
const mockShouldShowMoneyEarnBanner = jest.fn();
const mockTrackTokenButtonClicked = jest.fn();
const mockTrackTokenSurfaceClicked = jest.fn();

jest.mock('../../hooks/useMoneyAccount', () => ({
  useMoneyAccountDeposit: () => ({
    initiateDeposit: mockInitiateDeposit,
  }),
}));

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: () => mockUseMoneyAccountBalance(),
}));

jest.mock('../../hooks/useMoneyAnalytics');
jest.mock('../../hooks/useMoneyCtaVisibility');
jest.mock('../../hooks/useMoneyNavigation');

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockUseDispatch = jest.mocked(useDispatch);
const mockUseMoneyAnalytics = jest.mocked(useMoneyAnalytics);
const mockUseMoneyCtaVisibility = jest.mocked(useMoneyCtaVisibility);
const mockUseMoneyOnboardingNavigation = jest.mocked(
  useMoneyOnboardingNavigation,
);

const MOCK_USDC = {
  name: 'USD Coin',
  symbol: 'USDC',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1',
  image: 'https://example.com/usdc.png',
} as TokenI;

const MOCK_USDC_TOKEN_KEY = '0x1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

const MOCK_PREFERRED_PAYMENT_TOKEN = {
  address: MOCK_USDC.address,
  chainId: '0x1',
};

describe('MoneyEarnBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockInitiateDeposit.mockResolvedValue(undefined);
    mockRedirectToOnboardingIfNeeded.mockReturnValue(false);
    mockShouldShowMoneyEarnBanner.mockReturnValue(true);
    mockUseMoneyAccountBalance.mockReturnValue({ apyPercent: undefined });
    mockUseMoneyAnalytics.mockReturnValue({
      trackTokenButtonClicked: mockTrackTokenButtonClicked,
      trackTokenSurfaceClicked: mockTrackTokenSurfaceClicked,
    } as unknown as ReturnType<typeof useMoneyAnalytics>);
    mockUseMoneyCtaVisibility.mockReturnValue({
      shouldShowMoneyTokenListItemCta: jest.fn(),
      shouldShowMoneyEarnBanner: mockShouldShowMoneyEarnBanner,
    });
    mockUseMoneyOnboardingNavigation.mockReturnValue({
      redirectToOnboardingIfNeeded: mockRedirectToOnboardingIfNeeded,
    });
  });

  describe('visibility gate', () => {
    it('renders the banner when the visibility hook allows the asset', () => {
      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      expect(getByTestId(MoneyEarnBannerTestIds.CONTAINER)).toBeOnTheScreen();
      expect(getByTestId(MoneyEarnBannerTestIds.TOKEN_ICON)).toBeOnTheScreen();
      expect(mockShouldShowMoneyEarnBanner).toHaveBeenCalledWith(MOCK_USDC);
    });

    it('renders nothing when the visibility hook rejects the asset', () => {
      mockShouldShowMoneyEarnBanner.mockReturnValue(false);

      const { toJSON } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      expect(toJSON()).toBeNull();
    });

    it('renders nothing when the asset has no address', () => {
      const asset = { ...MOCK_USDC, address: '' } as TokenI;

      const { toJSON } = render(<MoneyEarnBanner asset={asset} />);

      expect(toJSON()).toBeNull();
    });

    it('renders nothing when the asset has no chainId', () => {
      const asset = { ...MOCK_USDC, chainId: undefined } as TokenI;

      const { toJSON } = render(<MoneyEarnBanner asset={asset} />);

      expect(toJSON()).toBeNull();
    });
  });

  describe('content', () => {
    it('initializes Money analytics with the asset detail screen and banner component', () => {
      render(<MoneyEarnBanner asset={MOCK_USDC} />);

      expect(mockUseMoneyAnalytics).toHaveBeenCalledWith({
        screen_name: SCREEN_NAMES.ASSET_DETAIL,
        component_name: COMPONENT_NAMES.MONEY_EARN_BANNER,
      });
    });

    it('renders the title with the APY when apyPercent is positive', () => {
      mockUseMoneyAccountBalance.mockReturnValue({ apyPercent: 5.2 });

      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      expect(getByTestId(MoneyEarnBannerTestIds.TITLE)).toHaveTextContent(
        strings('money.earn_banner.title', { apy: 5.2 }),
      );
    });

    it('falls back to the no-APY title when apyPercent is unavailable', () => {
      mockUseMoneyAccountBalance.mockReturnValue({ apyPercent: undefined });

      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      expect(getByTestId(MoneyEarnBannerTestIds.TITLE)).toHaveTextContent(
        strings('money.earn_banner.title_no_apy'),
      );
    });

    it('renders the description with the token symbol', () => {
      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      expect(getByTestId(MoneyEarnBannerTestIds.DESCRIPTION)).toHaveTextContent(
        strings('money.earn_banner.description', { symbol: 'USDC' }),
      );
    });

    it('renders the CTA with the token symbol', () => {
      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      expect(getByTestId(MoneyEarnBannerTestIds.CTA)).toHaveTextContent(
        strings('money.earn_banner.cta', { symbol: 'USDC' }),
      );
    });

    it('canonicalises the registry MUSD symbol to the branded mUSD casing', () => {
      const asset = {
        ...MOCK_USDC,
        address: MUSD_TOKEN_ADDRESS,
        symbol: 'MUSD',
      } as TokenI;

      const { getByTestId } = render(<MoneyEarnBanner asset={asset} />);

      expect(getByTestId(MoneyEarnBannerTestIds.CTA)).toHaveTextContent(
        strings('money.earn_banner.cta', { symbol: 'mUSD' }),
      );
    });

    it('renders the bundled source image for mUSD', () => {
      const asset = {
        ...MOCK_USDC,
        address: MUSD_TOKEN_ADDRESS,
        symbol: 'MUSD',
      } as TokenI;

      const { getByTestId } = render(<MoneyEarnBanner asset={asset} />);

      expect(
        getByTestId(MoneyEarnBannerTestIds.SOURCE_TOKEN_IMAGE),
      ).toBeOnTheScreen();
    });

    it('renders the bundled source image for stablecoins with a dedicated asset', () => {
      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      expect(
        getByTestId(MoneyEarnBannerTestIds.SOURCE_TOKEN_IMAGE),
      ).toBeOnTheScreen();
    });

    it('falls back to the token avatar for supported tokens without a dedicated asset', () => {
      const asset = { ...MOCK_USDC, symbol: 'EURC' } as TokenI;

      const { queryByTestId } = render(<MoneyEarnBanner asset={asset} />);

      expect(
        queryByTestId(MoneyEarnBannerTestIds.SOURCE_TOKEN_IMAGE),
      ).toBeNull();
    });
  });

  describe('card press', () => {
    it('initiates a deposit with the asset as preferred payment token when onboarding is not needed', () => {
      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      fireEvent.press(getByTestId(MoneyEarnBannerTestIds.CONTAINER));

      expect(mockRedirectToOnboardingIfNeeded).toHaveBeenCalledWith({
        postOnboardingRedirect: {
          type: MoneyPostOnboardingRedirectType.DEPOSIT,
          preferredPaymentToken: MOCK_PREFERRED_PAYMENT_TOKEN,
        },
      });
      expect(mockInitiateDeposit).toHaveBeenCalledTimes(1);
      expect(mockInitiateDeposit).toHaveBeenCalledWith({
        preferredPaymentToken: MOCK_PREFERRED_PAYMENT_TOKEN,
      });
      expect(mockTrackTokenSurfaceClicked).toHaveBeenCalledWith({
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
        token_symbol: MOCK_USDC.symbol,
        token_position_in_list: 1,
        token_chain_id: MOCK_USDC.chainId,
        tokens_in_list: 1,
      });
    });

    it('redirects first-time users to Money onboarding instead of the deposit flow', () => {
      mockRedirectToOnboardingIfNeeded.mockReturnValue(true);

      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      fireEvent.press(getByTestId(MoneyEarnBannerTestIds.CONTAINER));

      expect(mockInitiateDeposit).not.toHaveBeenCalled();
      expect(mockTrackTokenSurfaceClicked).toHaveBeenCalledWith({
        redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
        token_symbol: MOCK_USDC.symbol,
        token_position_in_list: 1,
        token_chain_id: MOCK_USDC.chainId,
        tokens_in_list: 1,
      });
    });

    it('logs an error when initiating the deposit fails', async () => {
      const error = new Error('deposit failed');
      mockInitiateDeposit.mockRejectedValueOnce(error);

      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);
      fireEvent.press(getByTestId(MoneyEarnBannerTestIds.CONTAINER));

      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalledWith(
          error,
          '[MoneyEarnBanner] Failed to initiate Money account deposit',
        );
      });
    });
  });

  describe('CTA press', () => {
    it('initiates a deposit and tracks an add-money button click when onboarding is not needed', () => {
      const ctaLabel = strings('money.earn_banner.cta', { symbol: 'USDC' });

      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      fireEvent.press(getByTestId(MoneyEarnBannerTestIds.CTA));

      expect(mockInitiateDeposit).toHaveBeenCalledWith({
        preferredPaymentToken: MOCK_PREFERRED_PAYMENT_TOKEN,
      });
      expect(mockTrackTokenButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
        label_en: ctaLabel,
        label_localized: ctaLabel,
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
        token_symbol: MOCK_USDC.symbol,
        token_position_in_list: 1,
        token_chain_id: MOCK_USDC.chainId,
        tokens_in_list: 1,
      });
    });

    it('tracks an onboarding button click without depositing when onboarding is needed', () => {
      mockRedirectToOnboardingIfNeeded.mockReturnValue(true);
      const ctaLabel = strings('money.earn_banner.cta', { symbol: 'USDC' });

      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      fireEvent.press(getByTestId(MoneyEarnBannerTestIds.CTA));

      expect(mockInitiateDeposit).not.toHaveBeenCalled();
      expect(mockTrackTokenButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
        label_en: ctaLabel,
        label_localized: ctaLabel,
        redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
        token_symbol: MOCK_USDC.symbol,
        token_position_in_list: 1,
        token_chain_id: MOCK_USDC.chainId,
        tokens_in_list: 1,
      });
    });
  });

  describe('close press', () => {
    it('tracks the dismiss click and dispatches setMoneyEarnBannerDismissed with the token key', () => {
      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      fireEvent.press(getByTestId(MoneyEarnBannerTestIds.CLOSE_BUTTON));

      expect(mockTrackTokenButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.ICON,
        button_intent: MONEY_BUTTON_INTENTS.DISMISS,
        token_symbol: MOCK_USDC.symbol,
        token_position_in_list: 1,
        token_chain_id: MOCK_USDC.chainId,
        tokens_in_list: 1,
      });
      expect(mockDispatch).toHaveBeenCalledWith(
        setMoneyEarnBannerDismissed(MOCK_USDC_TOKEN_KEY),
      );
    });

    it('does not initiate a deposit or track a surface click when close is pressed', () => {
      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      fireEvent.press(getByTestId(MoneyEarnBannerTestIds.CLOSE_BUTTON));

      expect(mockInitiateDeposit).not.toHaveBeenCalled();
      expect(mockTrackTokenSurfaceClicked).not.toHaveBeenCalled();
    });
  });
});
