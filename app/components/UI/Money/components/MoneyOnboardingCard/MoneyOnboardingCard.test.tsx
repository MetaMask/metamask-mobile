import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BigNumber from 'bignumber.js';
import MoneyOnboardingCard, {
  MONEY_ONBOARDING_TOTAL_STEPS,
} from './MoneyOnboardingCard';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import { useMoneyAccountCardLinkage } from '../../../Card/hooks/useMoneyAccountCardLinkage';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';

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
  isCardAuthenticated?: boolean;
  isCardLinkedToMoneyAccount?: boolean;
  isAggregatedBalanceLoading?: boolean;
  tokenTotal?: BigNumber;
}

const setupDefaultMocks = ({
  currentStep = 0,
  isCardAuthenticated = false,
  isCardLinkedToMoneyAccount = false,
  isAggregatedBalanceLoading = false,
  tokenTotal = new BigNumber(0),
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
    isAggregatedBalanceLoading,
  } as ReturnType<typeof useMoneyAccountBalance>);
  (mockUseMoneyAccountCardLinkage as jest.Mock).mockReturnValue({
    startLinkFlow: mockStartLinkFlow,
    isCardAuthenticated,
    isCardLinkedToMoneyAccount,
  });
};

describe('MoneyOnboardingCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('visibility guard', () => {
    it('returns null when currentStep equals MONEY_ONBOARDING_TOTAL_STEPS', () => {
      setupDefaultMocks({ currentStep: MONEY_ONBOARDING_TOTAL_STEPS });

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
        isAggregatedBalanceLoading: true,
        tokenTotal: new BigNumber(1),
      });

      render(<MoneyOnboardingCard />);

      expect(mockIncrementStep).not.toHaveBeenCalled();
    });

    it('renders the step 1 title', () => {
      setupDefaultMocks({ currentStep: 0 });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(getByTestId('money-onboarding-card-title')).toHaveTextContent(
        strings('money.onboarding.step_1.title'),
      );
    });

    it('renders the step 1 description', () => {
      setupDefaultMocks({ currentStep: 0 });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(
        getByTestId('money-onboarding-card-description'),
      ).toHaveTextContent(strings('money.onboarding.step_1.description'));
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
      fireEvent.press(getByTestId('money-onboarding-card-cta-button'));

      expect(mockStartLinkFlow).toHaveBeenCalledTimes(1);
      expect(mockStartLinkFlow).toHaveBeenCalledWith({
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });

    it('calls incrementStep when Skip CTA is pressed', () => {
      setupDefaultMocks({ currentStep: 1, isCardAuthenticated: false });

      const { getByText } = render(<MoneyOnboardingCard />);
      fireEvent.press(
        getByText(
          strings('money.onboarding.step_2.no_card_account.cta_secondary'),
        ),
      );

      expect(mockIncrementStep).toHaveBeenCalledTimes(1);
    });
  });

  describe('step 2 — cardholder with unlinked card', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders the unlinked-card title', () => {
      setupDefaultMocks({
        currentStep: 1,
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
        isCardAuthenticated: true,
        isCardLinkedToMoneyAccount: false,
      });

      const { getByTestId } = render(<MoneyOnboardingCard />);
      fireEvent.press(getByTestId('money-onboarding-card-cta-button'));

      expect(mockStartLinkFlow).toHaveBeenCalledTimes(1);
      expect(mockStartLinkFlow).toHaveBeenCalledWith({
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });

    it('calls incrementStep when Skip CTA is pressed', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardAuthenticated: true,
        isCardLinkedToMoneyAccount: false,
      });

      const { getByText } = render(<MoneyOnboardingCard />);
      fireEvent.press(
        getByText(
          strings(
            'money.onboarding.step_2.unlinked_card_account.cta_secondary',
          ),
        ),
      );

      expect(mockIncrementStep).toHaveBeenCalledTimes(1);
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
});
