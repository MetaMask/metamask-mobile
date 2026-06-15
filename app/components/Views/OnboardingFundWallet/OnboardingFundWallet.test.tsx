import React from 'react';
import { fireEvent, screen, act } from '@testing-library/react-native';
import { View, Pressable, Text } from 'react-native';
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

const MockView = View;
const MockPressable = Pressable;
const MockText = Text;

jest.mock('./MoreWaysToFundBottomSheet', () => ({
  __esModule: true,
  default: function MockMoreWaysToFundBottomSheet({
    onClose,
    onSelect,
  }: {
    onClose: () => void;
    onSelect: (optionId: string) => void;
  }) {
    return (
      <MockView testID="mock-more-ways-bottom-sheet">
        <MockPressable
          testID="mock-more-ways-select-revolut"
          onPress={() => onSelect('revolut_pay')}
        >
          <MockText>Revolut Pay</MockText>
        </MockPressable>
        <MockPressable
          testID="mock-more-ways-select-paypal"
          onPress={() => onSelect('paypal')}
        >
          <MockText>PayPal</MockText>
        </MockPressable>
        <MockPressable testID="mock-more-ways-close" onPress={onClose}>
          <MockText>Close</MockText>
        </MockPressable>
      </MockView>
    );
  },
}));

jest.mock('../../hooks/useAnalytics/useAnalytics');

const mockNavigateFromOnboardingToDepositFlow = jest.fn();
const mockNavigateFromOnboardingToReceiveFlow = jest.fn();

jest.mock('./navigateFromOnboardingToDepositFlow', () => ({
  navigateFromOnboardingToDepositFlow: (...args: unknown[]) =>
    mockNavigateFromOnboardingToDepositFlow(...args),
}));

jest.mock('./navigateFromOnboardingToReceiveFlow', () => ({
  navigateFromOnboardingToReceiveFlow: (...args: unknown[]) =>
    mockNavigateFromOnboardingToReceiveFlow(...args),
}));

const mockUseRampsUnifiedV2Enabled = jest.fn(() => true);

jest.mock('../../UI/Ramp/hooks/useRampsUnifiedV2Enabled', () => ({
  __esModule: true,
  default: () => mockUseRampsUnifiedV2Enabled(),
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

describe('OnboardingFundWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampsUnifiedV2Enabled.mockReturnValue(true);
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

    it('renders all funding options', () => {
      renderComponent();

      expect(
        screen.getByTestId(
          `${OnboardingFundWalletTestIds.OPTION_PREFIX}apple_pay`,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          `${OnboardingFundWalletTestIds.OPTION_PREFIX}debit_credit`,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          `${OnboardingFundWalletTestIds.OPTION_PREFIX}wire_transfer`,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          `${OnboardingFundWalletTestIds.OPTION_PREFIX}receive_external`,
        ),
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

    it('opens the deposit flow when Apple Pay is pressed', async () => {
      renderComponent();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            `${OnboardingFundWalletTestIds.OPTION_PREFIX}apple_pay`,
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
          selected_fund_method: 'apple_pay',
          skipped: false,
        }),
      );
      expect(mockNavigateFromOnboardingToDepositFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          goBack: expect.any(Function),
          navigate: expect.any(Function),
        }),
        true,
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

      const builderInstance = mockCreateEventBuilder.mock.results[1]?.value;

      expect(mockCreateEventBuilder).toHaveBeenNthCalledWith(
        2,
        MetaMetricsEvents.ONBOARDING_QUESTION_SUBMITTED,
      );
      expect(builderInstance.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          question_type: 'fund_wallet',
          selected_fund_method: 'receive_external',
          skipped: false,
        }),
      );
      expect(mockNavigateFromOnboardingToReceiveFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          goBack: expect.any(Function),
          navigate: expect.any(Function),
        }),
        { groupId: mockSelectedAccountGroupId },
      );
      expect(mockNavigateFromOnboardingToDepositFlow).not.toHaveBeenCalled();
      expect(mockOnComplete).not.toHaveBeenCalled();
    });

    it('opens the legacy deposit flow when unified V2 is disabled', async () => {
      mockUseRampsUnifiedV2Enabled.mockReturnValue(false);

      renderComponent();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            `${OnboardingFundWalletTestIds.OPTION_PREFIX}debit_credit`,
          ),
        );
      });

      expect(mockNavigateFromOnboardingToDepositFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          goBack: expect.any(Function),
          navigate: expect.any(Function),
        }),
        false,
      );
    });
  });

  describe('More ways to fund bottom sheet', () => {
    it('does not render the bottom sheet by default', () => {
      renderComponent();

      expect(
        screen.queryByTestId('mock-more-ways-bottom-sheet'),
      ).not.toBeOnTheScreen();
    });

    it('opens the bottom sheet when PayPal is pressed', () => {
      renderComponent();

      fireEvent.press(
        screen.getByTestId(
          `${OnboardingFundWalletTestIds.OPTION_PREFIX}paypal`,
        ),
      );

      expect(
        screen.getByTestId('mock-more-ways-bottom-sheet'),
      ).toBeOnTheScreen();
    });

    it('opens the bottom sheet when more payment methods is pressed', () => {
      renderComponent();

      fireEvent.press(
        screen.getByTestId(
          `${OnboardingFundWalletTestIds.OPTION_PREFIX}more_payment_methods`,
        ),
      );

      expect(
        screen.getByTestId('mock-more-ways-bottom-sheet'),
      ).toBeOnTheScreen();
    });

    it('shows the selected method on the PayPal row after selection', () => {
      renderComponent();

      fireEvent.press(
        screen.getByTestId(
          `${OnboardingFundWalletTestIds.OPTION_PREFIX}paypal`,
        ),
      );
      fireEvent.press(screen.getByTestId('mock-more-ways-select-revolut'));

      expect(
        screen.getByTestId(
          `${OnboardingFundWalletTestIds.OPTION_PREFIX}paypal${OnboardingFundWalletTestIds.SELECTION_SUFFIX}`,
        ),
      ).toHaveTextContent(
        strings('onboarding_fund_wallet.more_ways_option_revolut_pay'),
      );
    });

    it('shows PayPal on the more payment methods row when PayPal is selected', () => {
      renderComponent();

      fireEvent.press(
        screen.getByTestId(
          `${OnboardingFundWalletTestIds.OPTION_PREFIX}more_payment_methods`,
        ),
      );
      fireEvent.press(screen.getByTestId('mock-more-ways-select-paypal'));

      expect(
        screen.getByTestId(
          `${OnboardingFundWalletTestIds.OPTION_PREFIX}more_payment_methods${OnboardingFundWalletTestIds.SELECTION_SUFFIX}`,
        ),
      ).toHaveTextContent(
        strings('onboarding_fund_wallet.more_ways_option_paypal'),
      );
    });

    it('closes the bottom sheet when dismissed', () => {
      renderComponent();

      fireEvent.press(
        screen.getByTestId(
          `${OnboardingFundWalletTestIds.OPTION_PREFIX}paypal`,
        ),
      );
      fireEvent.press(screen.getByTestId('mock-more-ways-close'));

      expect(
        screen.queryByTestId('mock-more-ways-bottom-sheet'),
      ).not.toBeOnTheScreen();
    });
  });
});
