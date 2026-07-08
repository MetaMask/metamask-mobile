import React from 'react';
import { fireEvent, screen, act } from '@testing-library/react-native';
import { PaymentType } from '@consensys/on-ramp-sdk';
import type { PaymentMethod, Provider } from '@metamask/ramps-controller';
import { renderScreen } from '../../../util/test/renderWithProvider';
import OnboardingFundWallet from './OnboardingFundWallet';
import { OnboardingFundWalletTestIds } from './OnboardingFundWallet.testIds';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  createMockUseAnalyticsHook,
  createMockEventBuilder,
} from '../../../util/test/analyticsMock';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { strings } from '../../../../locales/i18n';
import { selectOnboardingAccountType } from '../../../selectors/onboarding';
import { selectSelectedAccountGroup } from '../../../selectors/multichainAccounts/accountTreeController';
import { useSelector } from 'react-redux';
import { MUSD_TOKEN_ASSET_ID_BY_CHAIN } from '../../UI/Earn/constants/musd';
import { CHAIN_IDS } from '@metamask/transaction-controller';

jest.mock('../../hooks/useAnalytics/useAnalytics');

const mockSetSelectedPaymentMethod = jest.fn();
const mockSetSelectedProvider = jest.fn();
const mockSetSelectedToken = jest.fn();
const mockUseRampsController = jest.fn();

const MOCK_TOKEN = {
  assetId: 'eip155:1/slip44:60',
  chainId: 'eip155:1',
  symbol: 'ETH',
};

const MOCK_SUPPORTING_PROVIDER = {
  id: '/providers/some-provider',
  name: 'Some Provider',
  supportedCryptoCurrencies: { [MOCK_TOKEN.assetId]: true },
} as unknown as Provider;

const MOCK_MUSD_TOKEN = {
  assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.MAINNET],
  chainId: 'eip155:1',
  symbol: 'mUSD',
};

jest.mock('../../UI/Ramp/hooks/useRampsController', () => ({
  __esModule: true,
  useRampsController: () => mockUseRampsController(),
}));

jest.mock('../../UI/Ramp/hooks/useRampsProviders', () => ({
  __esModule: true,
  default: jest.fn(),
  useRampsProviders: jest.fn(),
}));

const MOCK_APPLE_PAY = {
  id: '/payments/apple-pay',
  name: 'Apple Pay',
  paymentType: PaymentType.ApplePay,
  delay: [0, 0],
} as unknown as PaymentMethod;

const MOCK_DEBIT_CREDIT_CARD = {
  id: '/payments/debit-credit-card',
  name: 'Debit or Credit',
  paymentType: PaymentType.DebitCreditCard,
  delay: [0, 0],
} as unknown as PaymentMethod;

// A wallet method (e.g. PayPal-like) that should NOT appear under "Bank and
// card" — it is filtered out of that section.
const MOCK_WALLET = {
  id: '/payments/some-wallet',
  name: 'Some Wallet',
  paymentType: PaymentType.Wallet,
  delay: [0, 0],
} as unknown as PaymentMethod;

const MOCK_PAYPAL_PROVIDER = {
  id: '/providers/paypal',
  name: 'PayPal',
} as unknown as Provider;

const mockNavigateFromOnboardingToBuyFlow = jest.fn();
const mockNavigateFromOnboardingToReceiveFlow = jest.fn();

jest.mock('./navigateFromOnboardingToBuyFlow', () => ({
  navigateFromOnboardingToBuyFlow: (...args: unknown[]) =>
    mockNavigateFromOnboardingToBuyFlow(...args),
}));

jest.mock('./navigateFromOnboardingToReceiveFlow', () => ({
  navigateFromOnboardingToReceiveFlow: (...args: unknown[]) =>
    mockNavigateFromOnboardingToReceiveFlow(...args),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockOnComplete = jest.fn();

const mockFundWalletRouteParams: {
  onComplete: typeof mockOnComplete;
  accountType?: string;
  selectedInterests?: string[];
  otherText?: string;
} = {
  onComplete: mockOnComplete,
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      reset: jest.fn(),
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      key: 'OnboardingFundWallet',
      name: 'OnboardingFundWallet',
      params: mockFundWalletRouteParams,
    }),
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockSelectedAccountGroupId = 'test-account-group-id';

const mockUseSelector = jest.mocked(useSelector);

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => createMockEventBuilder());

const renderComponent = () =>
  renderScreen(
    OnboardingFundWallet,
    { name: 'OnboardingFundWallet' },
    { state: {} },
  );

const setControllerState = (
  overrides: Partial<{
    paymentMethods: PaymentMethod[];
    paymentMethodsLoading: boolean;
    paymentMethodsFetching: boolean;
    paymentMethodsStatus: 'idle' | 'loading' | 'success' | 'error';
    paymentMethodsError: string | null;
    providers: Provider[];
    providersLoading: boolean;
    selectedProvider: Provider | null;
    tokens: unknown;
    tokensLoading: boolean;
    selectedToken: unknown;
  }> = {},
) =>
  mockUseRampsController.mockReturnValue({
    userRegion: { regionCode: 'US' },
    paymentMethods: [MOCK_APPLE_PAY, MOCK_DEBIT_CREDIT_CARD],
    paymentMethodsLoading: false,
    paymentMethodsFetching: false,
    paymentMethodsStatus: 'success',
    paymentMethodsError: null,
    setSelectedPaymentMethod: mockSetSelectedPaymentMethod,
    providers: [MOCK_PAYPAL_PROVIDER],
    providersLoading: false,
    selectedProvider: MOCK_PAYPAL_PROVIDER,
    setSelectedProvider: mockSetSelectedProvider,
    tokens: null,
    tokensLoading: false,
    selectedToken: MOCK_TOKEN,
    setSelectedToken: mockSetSelectedToken,
    ...overrides,
  });

describe('OnboardingFundWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setControllerState();
    delete mockFundWalletRouteParams.accountType;
    delete mockFundWalletRouteParams.selectedInterests;
    delete mockFundWalletRouteParams.otherText;
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectOnboardingAccountType) {
        return undefined;
      }
      if (selector === selectSelectedAccountGroup) {
        return { id: mockSelectedAccountGroupId };
      }
      return undefined;
    });
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
  });

  describe('rendering', () => {
    it('renders the screen', () => {
      renderComponent();

      expect(
        screen.getByTestId(OnboardingFundWalletTestIds.SCREEN),
      ).toBeOnTheScreen();
    });

    it('renders the title', () => {
      renderComponent();

      expect(
        screen.getByText(strings('onboarding_fund_wallet.title')),
      ).toBeOnTheScreen();
    });

    it('renders the bank/card payment methods from the unified controller', () => {
      renderComponent();

      expect(
        screen.getByTestId(
          `${OnboardingFundWalletTestIds.OPTION_PREFIX}${MOCK_APPLE_PAY.id}`,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          `${OnboardingFundWalletTestIds.OPTION_PREFIX}${MOCK_DEBIT_CREDIT_CARD.id}`,
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText(MOCK_APPLE_PAY.name)).toBeOnTheScreen();
      expect(screen.getByText(MOCK_DEBIT_CREDIT_CARD.name)).toBeOnTheScreen();
    });

    it('filters out non-bank/card methods from the bank and card section', () => {
      setControllerState({
        paymentMethods: [MOCK_APPLE_PAY, MOCK_WALLET],
      });

      renderComponent();

      expect(
        screen.getByTestId(
          `${OnboardingFundWalletTestIds.OPTION_PREFIX}${MOCK_APPLE_PAY.id}`,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          `${OnboardingFundWalletTestIds.OPTION_PREFIX}${MOCK_WALLET.id}`,
        ),
      ).not.toBeOnTheScreen();
    });

    it('renders the receive crypto option', () => {
      renderComponent();

      expect(
        screen.getByTestId(
          `${OnboardingFundWalletTestIds.OPTION_PREFIX}receive_external`,
        ),
      ).toBeOnTheScreen();
    });

    it('renders a loader while payment methods are loading', () => {
      setControllerState({
        paymentMethods: [],
        paymentMethodsLoading: true,
        paymentMethodsStatus: 'loading',
      });

      renderComponent();

      expect(
        screen.getByTestId(OnboardingFundWalletTestIds.PAYMENT_METHODS_LOADER),
      ).toBeOnTheScreen();
    });

    it('renders a loader (not the unavailable message) while a supporting provider is being selected from the token', () => {
      setControllerState({
        paymentMethods: [],
        paymentMethodsStatus: 'idle',
        selectedToken: MOCK_TOKEN,
        selectedProvider: null,
        providers: [MOCK_SUPPORTING_PROVIDER],
      });

      renderComponent();

      expect(
        screen.getByTestId(OnboardingFundWalletTestIds.PAYMENT_METHODS_LOADER),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          OnboardingFundWalletTestIds.PAYMENT_METHODS_UNAVAILABLE,
        ),
      ).not.toBeOnTheScreen();
    });

    it('renders a loader while providers are loading', () => {
      setControllerState({
        paymentMethods: [],
        paymentMethodsStatus: 'idle',
        providers: [],
        providersLoading: true,
        selectedProvider: null,
      });

      renderComponent();

      expect(
        screen.getByTestId(OnboardingFundWalletTestIds.PAYMENT_METHODS_LOADER),
      ).toBeOnTheScreen();
    });

    it('renders a loader while tokens are loading', () => {
      setControllerState({
        paymentMethods: [],
        paymentMethodsStatus: 'idle',
        tokensLoading: true,
        selectedToken: null,
        selectedProvider: null,
      });

      renderComponent();

      expect(
        screen.getByTestId(OnboardingFundWalletTestIds.PAYMENT_METHODS_LOADER),
      ).toBeOnTheScreen();
    });

    it('seeds a default token and shows a loader while it applies', () => {
      setControllerState({
        paymentMethods: [],
        paymentMethodsStatus: 'idle',
        selectedToken: null,
        selectedProvider: null,
        tokens: { topTokens: [{ assetId: MOCK_TOKEN.assetId }] },
        providers: [MOCK_SUPPORTING_PROVIDER],
      });

      renderComponent();

      expect(mockSetSelectedToken).toHaveBeenCalledWith(MOCK_TOKEN.assetId);
      expect(
        screen.getByTestId(OnboardingFundWalletTestIds.PAYMENT_METHODS_LOADER),
      ).toBeOnTheScreen();
    });

    it('skips mUSD as the default token when no provider in the region supports it, falling back to a token that does', () => {
      // mUSD is present in the token list (e.g. curated/allTokens), but no
      // provider in this region can actually sell it — only MOCK_TOKEN (ETH)
      // is supported. The default seeding must not get stuck on mUSD.
      setControllerState({
        paymentMethods: [],
        paymentMethodsStatus: 'idle',
        selectedToken: null,
        selectedProvider: null,
        tokens: {
          topTokens: [MOCK_TOKEN],
          allTokens: [MOCK_MUSD_TOKEN, MOCK_TOKEN],
        },
        providers: [MOCK_SUPPORTING_PROVIDER],
      });

      renderComponent();

      expect(mockSetSelectedToken).toHaveBeenCalledWith(MOCK_TOKEN.assetId);
      expect(mockSetSelectedToken).not.toHaveBeenCalledWith(
        MOCK_MUSD_TOKEN.assetId,
      );
      expect(
        screen.getByTestId(OnboardingFundWalletTestIds.PAYMENT_METHODS_LOADER),
      ).toBeOnTheScreen();
    });

    it('prefers mUSD as the default token when a provider in the region does support it', () => {
      const mockMusdProvider = {
        id: '/providers/musd-provider',
        name: 'mUSD Provider',
        supportedCryptoCurrencies: { [MOCK_MUSD_TOKEN.assetId]: true },
      } as unknown as Provider;

      setControllerState({
        paymentMethods: [],
        paymentMethodsStatus: 'idle',
        selectedToken: null,
        selectedProvider: null,
        tokens: {
          topTokens: [MOCK_TOKEN],
          allTokens: [MOCK_MUSD_TOKEN, MOCK_TOKEN],
        },
        providers: [mockMusdProvider],
      });

      renderComponent();

      expect(mockSetSelectedToken).toHaveBeenCalledWith(
        MOCK_MUSD_TOKEN.assetId,
      );
    });

    it('renders an error message when payment methods fail to load', () => {
      setControllerState({
        paymentMethods: [],
        paymentMethodsError: 'boom',
      });

      renderComponent();

      expect(
        screen.getByTestId(OnboardingFundWalletTestIds.PAYMENT_METHODS_ERROR),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          OnboardingFundWalletTestIds.PAYMENT_METHODS_LOADER,
        ),
      ).not.toBeOnTheScreen();
    });

    it('shows the unavailable message when the query settled with no bank/card methods', () => {
      setControllerState({
        paymentMethods: [],
        paymentMethodsStatus: 'success',
      });

      renderComponent();

      expect(
        screen.getByTestId(
          OnboardingFundWalletTestIds.PAYMENT_METHODS_UNAVAILABLE,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          OnboardingFundWalletTestIds.PAYMENT_METHODS_LOADER,
        ),
      ).not.toBeOnTheScreen();
    });

    it('shows the unavailable message when no providers exist for the region', () => {
      setControllerState({
        paymentMethods: [],
        paymentMethodsStatus: 'idle',
        providers: [],
        providersLoading: false,
        selectedProvider: null,
        selectedToken: null,
        tokens: null,
      });

      renderComponent();

      expect(
        screen.getByTestId(
          OnboardingFundWalletTestIds.PAYMENT_METHODS_UNAVAILABLE,
        ),
      ).toBeOnTheScreen();
    });

    it('shows the unavailable message when a token is selected but no provider supports it', () => {
      setControllerState({
        paymentMethods: [],
        paymentMethodsStatus: 'idle',
        selectedToken: MOCK_TOKEN,
        selectedProvider: null,
        providers: [MOCK_PAYPAL_PROVIDER],
      });

      renderComponent();

      expect(
        screen.getByTestId(
          OnboardingFundWalletTestIds.PAYMENT_METHODS_UNAVAILABLE,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          OnboardingFundWalletTestIds.PAYMENT_METHODS_LOADER,
        ),
      ).not.toBeOnTheScreen();
    });

    it('renders the Skip button', () => {
      renderComponent();

      expect(
        screen.getByTestId(OnboardingFundWalletTestIds.SKIP_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders the back button', () => {
      renderComponent();

      expect(
        screen.getByTestId(OnboardingFundWalletTestIds.BACK_BUTTON),
      ).toBeOnTheScreen();
    });
  });

  describe('analytics on mount', () => {
    it('fires Viewed event on mount', () => {
      renderComponent();

      const builderInstance = mockCreateEventBuilder.mock.results[0]?.value;

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.ONBOARDING_QUESTION_VIEWED,
      );
      expect(builderInstance.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          question_type: 'fund_wallet',
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('goes back when the back button is pressed', async () => {
      renderComponent();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(OnboardingFundWalletTestIds.BACK_BUTTON),
        );
      });

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('fires Submitted with skipped=true and completes onboarding on Skip', async () => {
      renderComponent();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(OnboardingFundWalletTestIds.SKIP_BUTTON),
        );
      });

      const builderInstance = mockCreateEventBuilder.mock.results[1]?.value;

      expect(mockCreateEventBuilder).toHaveBeenNthCalledWith(
        2,
        MetaMetricsEvents.ONBOARDING_QUESTION_SUBMITTED,
      );
      expect(builderInstance.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          question_type: 'fund_wallet',
          skipped: true,
        }),
      );
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('pre-selects the method and opens the unified buy flow when a bank/card method is pressed', async () => {
      renderComponent();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            `${OnboardingFundWalletTestIds.OPTION_PREFIX}${MOCK_APPLE_PAY.id}`,
          ),
        );
      });

      const builderInstance = mockCreateEventBuilder.mock.results[1]?.value;

      expect(mockCreateEventBuilder).toHaveBeenNthCalledWith(
        2,
        MetaMetricsEvents.ONBOARDING_QUESTION_SUBMITTED,
      );
      expect(builderInstance.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          question_type: 'fund_wallet',
          selected_fund_method: MOCK_APPLE_PAY.id,
          skipped: false,
        }),
      );
      expect(mockSetSelectedPaymentMethod).toHaveBeenCalledWith(MOCK_APPLE_PAY);
      expect(mockNavigateFromOnboardingToBuyFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          goBack: expect.any(Function),
          navigate: expect.any(Function),
        }),
      );
      expect(mockOnComplete).not.toHaveBeenCalled();
    });

    it('opens the receive flow when Receive from external assets is pressed', async () => {
      renderComponent();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            `${OnboardingFundWalletTestIds.OPTION_PREFIX}receive_external`,
          ),
        );
      });

      expect(mockNavigateFromOnboardingToReceiveFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          goBack: expect.any(Function),
          navigate: expect.any(Function),
        }),
        { groupId: mockSelectedAccountGroupId },
      );
      expect(mockNavigateFromOnboardingToBuyFlow).not.toHaveBeenCalled();
      expect(mockOnComplete).not.toHaveBeenCalled();
    });
  });

  describe('more ways to fund', () => {
    it('always renders the curated more-ways entries (PayPal, more payment methods)', () => {
      renderComponent();

      expect(
        screen.getByText(strings('onboarding_fund_wallet.section_more_ways')),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          `${OnboardingFundWalletTestIds.OPTION_PREFIX}paypal`,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          `${OnboardingFundWalletTestIds.OPTION_PREFIX}more_payment_methods`,
        ),
      ).toBeOnTheScreen();
    });

    it('pre-selects the PayPal provider and opens the flow when PayPal is eligible', async () => {
      setControllerState({ providers: [MOCK_PAYPAL_PROVIDER] });
      renderComponent();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            `${OnboardingFundWalletTestIds.OPTION_PREFIX}paypal`,
          ),
        );
      });

      const builderInstance = mockCreateEventBuilder.mock.results[1]?.value;
      expect(builderInstance.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          question_type: 'fund_wallet',
          selected_fund_method: 'paypal',
          skipped: false,
        }),
      );
      expect(mockSetSelectedProvider).toHaveBeenCalledWith(
        MOCK_PAYPAL_PROVIDER,
      );
      expect(mockSetSelectedPaymentMethod).not.toHaveBeenCalled();
      expect(mockNavigateFromOnboardingToBuyFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          goBack: expect.any(Function),
          navigate: expect.any(Function),
        }),
      );
    });

    it('opens the flow without pre-selection when PayPal is not eligible (graceful fallback)', async () => {
      setControllerState({ providers: [] });
      renderComponent();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            `${OnboardingFundWalletTestIds.OPTION_PREFIX}paypal`,
          ),
        );
      });

      expect(mockSetSelectedProvider).not.toHaveBeenCalled();
      expect(mockSetSelectedPaymentMethod).not.toHaveBeenCalled();
      expect(mockNavigateFromOnboardingToBuyFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          goBack: expect.any(Function),
          navigate: expect.any(Function),
        }),
      );
    });

    it('opens the "more ways to fund" bottom sheet when more_payment_methods is pressed', async () => {
      renderComponent();

      expect(
        screen.queryByTestId('more-ways-option-google_pay'),
      ).not.toBeOnTheScreen();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            `${OnboardingFundWalletTestIds.OPTION_PREFIX}more_payment_methods`,
          ),
        );
      });

      expect(
        screen.getByTestId('more-ways-option-google_pay'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('more-ways-option-revolut_pay'),
      ).toBeOnTheScreen();
      expect(mockNavigateFromOnboardingToBuyFlow).not.toHaveBeenCalled();
    });

    it('tracks the selection, closes the sheet and opens the buy flow when a bottom sheet entry is selected', async () => {
      renderComponent();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            `${OnboardingFundWalletTestIds.OPTION_PREFIX}more_payment_methods`,
          ),
        );
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('more-ways-option-google_pay'));
      });

      const builderInstance = mockCreateEventBuilder.mock.results[1]?.value;
      expect(builderInstance.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          question_type: 'fund_wallet',
          selected_fund_method: 'google_pay',
          skipped: false,
        }),
      );
      expect(
        screen.queryByTestId('more-ways-option-google_pay'),
      ).not.toBeOnTheScreen();
      expect(mockNavigateFromOnboardingToBuyFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          goBack: expect.any(Function),
          navigate: expect.any(Function),
        }),
      );
    });
  });
});
