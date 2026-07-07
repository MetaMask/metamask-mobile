import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BigNumber from 'bignumber.js';
import { useSelector } from 'react-redux';
import MoneyOnboardingCard, {
  MONEY_ONBOARDING_TOTAL_STEPS,
} from './MoneyOnboardingCard';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import { useMoneyAccountCardLinkage } from '../../../Card/hooks/useMoneyAccountCardLinkage';
import { MONEY_HOME_CARD_ORIGIN } from '../../../Card/hooks/useCardPostAuthRedirect';
import { strings } from '../../../../../../locales/i18n';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  CardActions,
  CardEntryPoint,
  CardScreens,
} from '../../../Card/util/metrics';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  MONEY_ONBOARDING_STEP_ACTIONS,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { selectIsCardholder } from '../../../../../selectors/cardController';

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({ name: 'built-event' }));
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn((_eventName?: unknown) => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

const mockTrackOnboardingEvent = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../hooks/useOnboardingStep', () => ({
  useOnboardingStep: jest.fn(),
  STEPPER_IDS: { MONEY: 'money-home-onboarding-stepper' },
}));

jest.mock('../../hooks/useMoneyAccount', () => ({
  useMoneyAccountDeposit: jest.fn(),
}));

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../Card/hooks/useMoneyAccountCardLinkage', () => ({
  __esModule: true,
  useMoneyAccountCardLinkage: jest.fn(),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockIsCardholder = jest.fn(() => true);
const mockCardHomeDataStatus = jest.fn(() => 'success');
jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector(undefined),
}));
jest.mock('../../../../../selectors/cardController', () => ({
  selectIsCardholder: () => mockIsCardholder(),
  selectCardHomeDataStatus: () => mockCardHomeDataStatus(),
}));

const mockUseOnboardingStep = useOnboardingStep as jest.MockedFunction<
  typeof useOnboardingStep
>;
const mockUseMoneyAccountDeposit =
  useMoneyAccountDeposit as jest.MockedFunction<typeof useMoneyAccountDeposit>;
const mockUseMoneyAccountBalance = jest.mocked(useMoneyAccountBalance);
const mockUseMoneyAccountCardLinkage =
  useMoneyAccountCardLinkage as jest.MockedFunction<
    typeof useMoneyAccountCardLinkage
  >;

const mockIncrementStep = jest.fn();
const mockInitiateDeposit = jest.fn().mockResolvedValue(undefined);
const mockStartLinkFlow = jest.fn();

interface SetupOptions {
  currentStep?: number;
  isCardholder?: boolean;
  isCardAuthenticated?: boolean;
  isCardVerified?: boolean;
  isCardLinkedToMoneyAccount?: boolean;
  isResidencyBlocked?: boolean;
  isAggregatedBalanceLoading?: boolean;
  isBalanceLoading?: boolean;
  tokenTotal?: BigNumber;
  apyPercent?: number;
}

const setupDefaultMocks = ({
  currentStep = 0,
  isCardholder = false,
  isCardAuthenticated = false,
  isCardVerified = false,
  isCardLinkedToMoneyAccount = false,
  isResidencyBlocked = false,
  isAggregatedBalanceLoading = false,
  isBalanceLoading = false,
  tokenTotal = new BigNumber(0),
  apyPercent,
}: SetupOptions = {}) => {
  mockUseOnboardingStep.mockReturnValue({
    currentStep,
    incrementStep: mockIncrementStep,
    isVisible: currentStep < MONEY_ONBOARDING_TOTAL_STEPS,
  });
  (mockUseMoneyAccountDeposit as jest.Mock).mockReturnValue({
    initiateDeposit: mockInitiateDeposit,
  });
  mockUseMoneyAccountBalance.mockReturnValue({
    tokenTotal,
    isBalanceLoading,
    apyPercent,
  } as ReturnType<typeof useMoneyAccountBalance>);
  (mockUseMoneyAccountCardLinkage as jest.Mock).mockReturnValue({
    startLinkFlow: mockStartLinkFlow,
    isCardAuthenticated,
    isCardVerified,
    isCardLinkedToMoneyAccount,
    isResidencyBlocked,
    isLinking: false,
  });
  mockIsCardholder.mockReturnValue(isCardholder);
};

describe('MoneyOnboardingCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackOnboardingEvent: mockTrackOnboardingEvent,
    });
  });

  describe('visibility guard', () => {
    it('returns null when currentStep equals MONEY_ONBOARDING_TOTAL_STEPS', () => {
      setupDefaultMocks({ currentStep: MONEY_ONBOARDING_TOTAL_STEPS });

      const { toJSON } = render(<MoneyOnboardingCard />);

      expect(toJSON()).toBeNull();
    });

    it('returns null when balance is loading', () => {
      setupDefaultMocks({ isBalanceLoading: true });

      const { toJSON } = render(<MoneyOnboardingCard />);

      expect(toJSON()).toBeNull();
    });

    it('renders the card container when currentStep is 0', () => {
      setupDefaultMocks({ currentStep: 0 });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(getByTestId('money-onboarding-card-container')).toBeOnTheScreen();
    });
  });

  describe('step 1 — fund your account', () => {
    it('calls incrementStep on mount when balance is non-zero', () => {
      setupDefaultMocks({
        currentStep: 0,
        tokenTotal: new BigNumber(1),
      });

      render(<MoneyOnboardingCard />);

      expect(mockIncrementStep).toHaveBeenCalledTimes(1);
    });

    it('does not call incrementStep while balance is loading', () => {
      setupDefaultMocks({
        currentStep: 0,
        isBalanceLoading: true,
        tokenTotal: new BigNumber(1),
      });

      render(<MoneyOnboardingCard />);

      expect(mockIncrementStep).not.toHaveBeenCalled();
    });

    it('renders the APY step 1 title and description when APY is available', () => {
      setupDefaultMocks({ currentStep: 0, apyPercent: 4 });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(getByTestId('money-onboarding-card-title')).toHaveTextContent(
        strings('money.onboarding.step_1.title', { apy: 4 }),
      );
      expect(
        getByTestId('money-onboarding-card-description'),
      ).toHaveTextContent(
        strings('money.onboarding.step_1.description', { apy: 4 }),
      );
    });

    it('falls back to the no-APY step 1 copy when APY is unavailable', () => {
      setupDefaultMocks({ currentStep: 0 });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(getByTestId('money-onboarding-card-title')).toHaveTextContent(
        strings('money.onboarding.step_1.title_no_apy'),
      );
      expect(
        getByTestId('money-onboarding-card-description'),
      ).toHaveTextContent(
        strings('money.onboarding.step_1.description_no_apy'),
      );
    });

    it('renders the Add funds primary CTA', () => {
      setupDefaultMocks({ currentStep: 0 });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(getByTestId('money-onboarding-card-cta-button')).toHaveTextContent(
        strings('money.onboarding.step_1.cta'),
      );
    });

    it('calls initiateDeposit when Add funds CTA is pressed', () => {
      setupDefaultMocks({ currentStep: 0 });

      const { getByTestId } = render(<MoneyOnboardingCard />);
      fireEvent.press(getByTestId('money-onboarding-card-cta-button'));

      expect(mockInitiateDeposit).toHaveBeenCalledTimes(1);
    });
  });

  describe('step 2 — no card yet', () => {
    it('renders the no-card description', () => {
      setupDefaultMocks({ currentStep: 1, isCardAuthenticated: false });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(
        getByTestId('money-onboarding-card-description'),
      ).toHaveTextContent(
        strings('money.onboarding.step_2.no_card_account.description'),
      );
    });

    it('renders the Get card primary CTA', () => {
      setupDefaultMocks({ currentStep: 1, isCardAuthenticated: false });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(getByTestId('money-onboarding-card-cta-button')).toHaveTextContent(
        strings('money.onboarding.step_2.no_card_account.cta_primary'),
      );
    });

    it('renders the Skip secondary CTA', () => {
      setupDefaultMocks({ currentStep: 1, isCardAuthenticated: false });

      const { getByText } = render(<MoneyOnboardingCard />);

      expect(
        getByText(
          strings('money.onboarding.step_2.no_card_account.cta_secondary'),
        ),
      ).toBeOnTheScreen();
    });

    it('calls startLinkFlow with Money home origin when Get card CTA is pressed', () => {
      setupDefaultMocks({ currentStep: 1, isCardAuthenticated: false });

      const { getByTestId } = render(<MoneyOnboardingCard />);
      jest.clearAllMocks();
      fireEvent.press(getByTestId('money-onboarding-card-cta-button'));

      expect(mockStartLinkFlow).toHaveBeenCalledTimes(1);
      expect(mockStartLinkFlow).toHaveBeenCalledWith(MONEY_HOME_CARD_ORIGIN);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        screen: CardScreens.MONEY_HOME,
        entrypoint: CardEntryPoint.MONEY_HOME_ONBOARDING_CARD,
        action: CardActions.MONEY_ACCOUNT_ONBOARDING_CARD_PRIMARY_BUTTON,
        card_state: 'non_cardholder',
      });
    });

    it('calls incrementStep when Skip CTA is pressed', () => {
      setupDefaultMocks({ currentStep: 1, isCardAuthenticated: false });

      const { getByText } = render(<MoneyOnboardingCard />);
      jest.clearAllMocks();
      fireEvent.press(
        getByText(
          strings('money.onboarding.step_2.no_card_account.cta_secondary'),
        ),
      );

      expect(mockIncrementStep).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        screen: CardScreens.MONEY_HOME,
        entrypoint: CardEntryPoint.MONEY_HOME_ONBOARDING_CARD,
        action: CardActions.MONEY_ACCOUNT_ONBOARDING_CARD_SKIP_BUTTON,
        card_state: 'non_cardholder',
      });
    });

    it('tracks Card view when the Card step is rendered', () => {
      setupDefaultMocks({ currentStep: 1, isCardAuthenticated: false });

      render(<MoneyOnboardingCard />);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        screen: CardScreens.MONEY_HOME,
        entrypoint: CardEntryPoint.MONEY_HOME_ONBOARDING_CARD,
        card_state: 'non_cardholder',
      });
    });

    it('emits card_state="non_cardholder" when account is not a cardholder', () => {
      mockIsCardholder.mockReturnValue(false);
      setupDefaultMocks({ currentStep: 1, isCardAuthenticated: false });

      render(<MoneyOnboardingCard />);

      expect(mockAddProperties).toHaveBeenCalledWith({
        screen: CardScreens.MONEY_HOME,
        entrypoint: CardEntryPoint.MONEY_HOME_ONBOARDING_CARD,
        card_state: 'non_cardholder',
      });

      mockIsCardholder.mockReturnValue(true);
    });

    it('does not emit Card view while card home data is still loading', () => {
      mockCardHomeDataStatus.mockReturnValue('loading');
      setupDefaultMocks({ currentStep: 1, isCardAuthenticated: false });

      render(<MoneyOnboardingCard />);

      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_VIEWED,
      );

      mockCardHomeDataStatus.mockReturnValue('success');
    });

    it('defers Card view tracking until card flags settle and emits the resolved card_state', () => {
      // Initial render mirrors a rehydrating store: card data is loading and the
      // cardholder flag has not been restored yet (would derive non_cardholder).
      mockIsCardholder.mockReturnValue(false);
      mockCardHomeDataStatus.mockReturnValue('loading');
      setupDefaultMocks({ currentStep: 1, isCardAuthenticated: false });

      const { rerender } = render(<MoneyOnboardingCard />);

      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_VIEWED,
      );

      // Card data settles: the account is a cardholder without an active card.
      mockIsCardholder.mockReturnValue(true);
      mockCardHomeDataStatus.mockReturnValue('success');
      rerender(<MoneyOnboardingCard />);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        screen: CardScreens.MONEY_HOME,
        entrypoint: CardEntryPoint.MONEY_HOME_ONBOARDING_CARD,
        card_state: 'no_card',
      });

      mockIsCardholder.mockReturnValue(true);
      mockCardHomeDataStatus.mockReturnValue('success');
    });
  });

  describe('step 2 — cardholder with unlinked card', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders the unlinked-card title', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardholder: true,
        isCardAuthenticated: true,
        isCardLinkedToMoneyAccount: false,
      });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(getByTestId('money-onboarding-card-title')).toHaveTextContent(
        strings('money.onboarding.step_2.unlinked_card_account.title'),
      );
    });

    it('renders the unlinked-card description', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardholder: true,
        isCardAuthenticated: true,
        isCardLinkedToMoneyAccount: false,
      });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(
        getByTestId('money-onboarding-card-description'),
      ).toHaveTextContent(
        strings('money.onboarding.step_2.unlinked_card_account.description'),
      );
    });

    it('renders the Link card primary CTA', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardholder: true,
        isCardAuthenticated: true,
        isCardLinkedToMoneyAccount: false,
      });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(getByTestId('money-onboarding-card-cta-button')).toHaveTextContent(
        strings('money.onboarding.step_2.unlinked_card_account.cta_primary'),
      );
    });

    it('calls startLinkFlow with Money home origin when Link card CTA is pressed', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardholder: true,
        isCardAuthenticated: true,
        isCardLinkedToMoneyAccount: false,
      });

      const { getByTestId } = render(<MoneyOnboardingCard />);
      jest.clearAllMocks();
      fireEvent.press(getByTestId('money-onboarding-card-cta-button'));

      expect(mockStartLinkFlow).toHaveBeenCalledTimes(1);
      expect(mockStartLinkFlow).toHaveBeenCalledWith(MONEY_HOME_CARD_ORIGIN);
      expect(mockAddProperties).toHaveBeenCalledWith({
        screen: CardScreens.MONEY_HOME,
        entrypoint: CardEntryPoint.MONEY_HOME_ONBOARDING_CARD,
        action: CardActions.MONEY_ACCOUNT_ONBOARDING_CARD_PRIMARY_BUTTON,
        card_state: 'unlinked_card',
      });
    });

    it('calls incrementStep when Skip CTA is pressed', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardholder: true,
        isCardAuthenticated: true,
        isCardLinkedToMoneyAccount: false,
      });

      const { getByText } = render(<MoneyOnboardingCard />);
      jest.clearAllMocks();
      fireEvent.press(
        getByText(
          strings(
            'money.onboarding.step_2.unlinked_card_account.cta_secondary',
          ),
        ),
      );

      expect(mockIncrementStep).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith({
        screen: CardScreens.MONEY_HOME,
        entrypoint: CardEntryPoint.MONEY_HOME_ONBOARDING_CARD,
        action: CardActions.MONEY_ACCOUNT_ONBOARDING_CARD_SKIP_BUTTON,
        card_state: 'unlinked_card',
      });
    });
  });

  describe('step 2 — cardholder not authenticated', () => {
    it('renders the unlinked-card title when user is a cardholder but not authenticated', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardholder: true,
        isCardAuthenticated: false,
        isCardLinkedToMoneyAccount: false,
      });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(getByTestId('money-onboarding-card-title')).toHaveTextContent(
        strings('money.onboarding.step_2.unlinked_card_account.title'),
      );
    });

    it('renders the Link card primary CTA when user is a cardholder but not authenticated', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardholder: true,
        isCardAuthenticated: false,
        isCardLinkedToMoneyAccount: false,
      });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(getByTestId('money-onboarding-card-cta-button')).toHaveTextContent(
        strings('money.onboarding.step_2.unlinked_card_account.cta_primary'),
      );
    });

    it('calls trackOnboardingEvent with LINK_CARD when cardholder (not authenticated) presses the CTA', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardholder: true,
        isCardAuthenticated: false,
        isCardLinkedToMoneyAccount: false,
      });

      const { getByTestId } = render(<MoneyOnboardingCard />);
      fireEvent.press(getByTestId('money-onboarding-card-cta-button'));

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 2,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.LINK_CARD,
          redirect_target: BOTTOM_SHEET_NAMES.CARD_LINK_SHEET,
          total_steps: MONEY_ONBOARDING_TOTAL_STEPS,
        }),
      );
    });
  });

  describe('step 2 — cardholder with linked card (auto-skip)', () => {
    it('calls incrementStep on mount when card is authenticated and linked', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardAuthenticated: true,
        isCardLinkedToMoneyAccount: true,
      });

      render(<MoneyOnboardingCard />);

      expect(mockIncrementStep).toHaveBeenCalledTimes(1);
    });

    it('does not call incrementStep when card is authenticated but not linked', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardAuthenticated: true,
        isCardLinkedToMoneyAccount: false,
      });

      render(<MoneyOnboardingCard />);

      expect(mockIncrementStep).not.toHaveBeenCalled();
    });

    it('does not call incrementStep when card is not authenticated', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardAuthenticated: false,
        isCardLinkedToMoneyAccount: true,
      });

      render(<MoneyOnboardingCard />);

      expect(mockIncrementStep).not.toHaveBeenCalled();
    });

    it('does not call incrementStep when currentStep is not 1', () => {
      setupDefaultMocks({
        currentStep: 0,
        isCardAuthenticated: true,
        isCardLinkedToMoneyAccount: true,
      });

      render(<MoneyOnboardingCard />);

      expect(mockIncrementStep).not.toHaveBeenCalled();
    });
  });

  describe('step 2 — authenticated but not VERIFIED', () => {
    it('renders the no-card step instead of the link-card step', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardAuthenticated: true,
        isCardVerified: false,
        isCardLinkedToMoneyAccount: false,
      });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(getByTestId('money-onboarding-card-title')).toHaveTextContent(
        strings('money.onboarding.step_2.no_card_account.title'),
      );
      expect(getByTestId('money-onboarding-card-cta-button')).toHaveTextContent(
        strings('money.onboarding.step_2.no_card_account.cta_primary'),
      );
    });
  });

  describe('steps memo guard — card hidden', () => {
    it('renders null and shows no step content when currentStep equals MONEY_ONBOARDING_TOTAL_STEPS', () => {
      setupDefaultMocks({ currentStep: MONEY_ONBOARDING_TOTAL_STEPS });

      const { toJSON, queryByText } = render(<MoneyOnboardingCard />);

      expect(toJSON()).toBeNull();
      expect(queryByText(strings('money.onboarding.step_1.title'))).toBeNull();
      expect(
        queryByText(strings('money.onboarding.step_2.no_card_account.title')),
      ).toBeNull();
    });
  });

  describe('analytics', () => {
    it('initialises useMoneyAnalytics with MONEY_HOME screen_name and MONEY_ONBOARDING_CARD component_name', () => {
      setupDefaultMocks();

      render(<MoneyOnboardingCard />);

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        screen_name: SCREEN_NAMES.MONEY_HOME,
        component_name: COMPONENT_NAMES.MONEY_ONBOARDING_CARD,
      });
    });

    it('calls trackOnboardingEvent with DEPOSIT_INITIATED when Add funds CTA is pressed at step 1', () => {
      setupDefaultMocks({ currentStep: 0 });

      const { getByTestId } = render(<MoneyOnboardingCard />);
      fireEvent.press(getByTestId('money-onboarding-card-cta-button'));

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 1,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.DEPOSIT_INITIATED,
          redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
          total_steps: MONEY_ONBOARDING_TOTAL_STEPS,
        }),
      );
    });

    it('calls trackOnboardingEvent with GET_CARD when Get card CTA is pressed for unauthenticated user at step 2', () => {
      setupDefaultMocks({ currentStep: 1, isCardAuthenticated: false });

      const { getByTestId } = render(<MoneyOnboardingCard />);
      fireEvent.press(getByTestId('money-onboarding-card-cta-button'));

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 2,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.GET_CARD,
          redirect_target: BOTTOM_SHEET_NAMES.CARD_AUTH_SHEET,
          total_steps: MONEY_ONBOARDING_TOTAL_STEPS,
        }),
      );
    });

    it('calls trackOnboardingEvent with LINK_CARD when CTA is pressed for authenticated but unlinked cardholder at step 2', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardholder: true,
        isCardAuthenticated: true,
        isCardLinkedToMoneyAccount: false,
      });

      const { getByTestId } = render(<MoneyOnboardingCard />);
      fireEvent.press(getByTestId('money-onboarding-card-cta-button'));

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 2,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.LINK_CARD,
          redirect_target: BOTTOM_SHEET_NAMES.CARD_LINK_SHEET,
          total_steps: MONEY_ONBOARDING_TOTAL_STEPS,
        }),
      );
    });

    it('calls trackOnboardingEvent with SKIPPED when Skip CTA is pressed at step 2', () => {
      setupDefaultMocks({ currentStep: 1, isCardAuthenticated: false });

      const { getByText } = render(<MoneyOnboardingCard />);
      fireEvent.press(
        getByText(
          strings('money.onboarding.step_2.no_card_account.cta_secondary'),
        ),
      );

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 2,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.SKIPPED,
          total_steps: MONEY_ONBOARDING_TOTAL_STEPS,
        }),
      );
    });
  });

  describe('residency blocking', () => {
    it('auto-skips step 2 when residency is blocked and account is funded', () => {
      setupDefaultMocks({
        currentStep: 0,
        isCardholder: true,
        isCardAuthenticated: true,
        isCardVerified: true,
        isResidencyBlocked: true,
        tokenTotal: new BigNumber(100),
      });

      const { toJSON } = render(<MoneyOnboardingCard />);

      expect(toJSON()).toBeNull();
    });

    it('shows get-card step 2 when residency is not blocked', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardAuthenticated: false,
        isResidencyBlocked: false,
      });

      const { getByText } = render(<MoneyOnboardingCard />);

      expect(
        getByText(strings('money.onboarding.step_2.no_card_account.title')),
      ).toBeOnTheScreen();
    });
  });
});
