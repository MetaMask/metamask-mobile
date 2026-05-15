import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import MoneyOnboardingCard, {
  MONEY_ONBOARDING_TOTAL_STEPS,
} from './MoneyOnboardingCard';
import { useMoneyOnboardingStep } from '../../hooks/useMoneyOnboardingStep';
import { useMusdBalance } from '../../../Earn/hooks/useMusdBalance';
import { useMusdConversionTokens } from '../../../Earn/hooks/useMusdConversionTokens';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import useMoneyAccountCardLinkage from '../../../Card/hooks/useMoneyAccountCardLinkage';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../hooks/useMoneyOnboardingStep', () => ({
  useMoneyOnboardingStep: jest.fn(),
}));

jest.mock('../../../Earn/hooks/useMusdBalance', () => ({
  useMusdBalance: jest.fn(),
}));

jest.mock('../../../Earn/hooks/useMusdConversionTokens', () => ({
  useMusdConversionTokens: jest.fn(),
}));

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
  getLiveVedaVaultExchangeRate: jest.fn(),
}));

jest.mock('../../../Card/hooks/useMoneyAccountCardLinkage', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../utils/moneyFormatFiat', () => ({
  moneyFormatFiat: jest.fn(() => '$100.00'),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseMoneyOnboardingStep =
  useMoneyOnboardingStep as jest.MockedFunction<typeof useMoneyOnboardingStep>;
const mockUseMusdBalance = useMusdBalance as jest.MockedFunction<
  typeof useMusdBalance
>;
const mockUseMusdConversionTokens =
  useMusdConversionTokens as jest.MockedFunction<
    typeof useMusdConversionTokens
  >;
const mockUseMoneyAccountBalance =
  useMoneyAccountBalance as jest.MockedFunction<typeof useMoneyAccountBalance>;
const mockUseMoneyAccountCardLinkage =
  useMoneyAccountCardLinkage as jest.MockedFunction<
    typeof useMoneyAccountCardLinkage
  >;

const mockNavigate = jest.fn();
const mockIncrementStep = jest.fn();
const mockOpenLinkCardSheet = jest.fn();

interface SetupOptions {
  currentStep?: number;
  musdBalance?: string;
  tokens?: { fiat?: { balance: string } }[];
  isCardholder?: boolean;
  moneyAccountCardToken?: string | null;
  canLink?: boolean;
}

const setupDefaultMocks = ({
  currentStep = 0,
  musdBalance = '0',
  tokens = [],
  isCardholder = false,
  moneyAccountCardToken = null,
  canLink = false,
}: SetupOptions = {}) => {
  mockUseMoneyOnboardingStep.mockReturnValue({
    currentStep,
    incrementStep: mockIncrementStep,
  });
  mockUseMusdBalance.mockReturnValue({
    tokenBalanceAggregated: musdBalance,
  } as never);
  mockUseMusdConversionTokens.mockReturnValue({ tokens } as never);
  (mockUseMoneyAccountBalance as jest.Mock).mockReturnValue({ apyPercent: 4 });
  (mockUseMoneyAccountCardLinkage as jest.Mock).mockReturnValue({
    moneyAccountCardToken,
    canLink,
    openLinkCardSheet: mockOpenLinkCardSheet,
  });
  mockUseNavigation.mockReturnValue({ navigate: mockNavigate } as never);
  // First useSelector call: selectCurrentCurrency; second: selectIsCardholder.
  // mockReturnValue sets the fallback for any calls after the Once queue is exhausted.
  mockUseSelector
    .mockReturnValue(isCardholder)
    .mockReturnValueOnce('USD')
    .mockReturnValueOnce(isCardholder);
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

  describe('step 1 — default content (no crypto, no mUSD)', () => {
    it('renders the step 1 title', () => {
      setupDefaultMocks({ currentStep: 0, musdBalance: '0', tokens: [] });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(getByTestId('money-onboarding-card-title')).toHaveTextContent(
        strings('money.onboarding.step_1.title'),
      );
    });

    it('renders the default description', () => {
      setupDefaultMocks({ currentStep: 0, musdBalance: '0', tokens: [] });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(
        getByTestId('money-onboarding-card-description'),
      ).toHaveTextContent(
        strings('money.onboarding.step_1.description_no_crypto_no_musd'),
      );
    });

    it('does not render a tooltip icon in the default case', () => {
      setupDefaultMocks({ currentStep: 0, musdBalance: '0', tokens: [] });

      const { queryByLabelText } = render(<MoneyOnboardingCard />);

      expect(queryByLabelText('More information')).toBeNull();
    });

    it('renders the Add funds primary CTA', () => {
      setupDefaultMocks({ currentStep: 0 });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(getByTestId('money-onboarding-card-cta-button')).toHaveTextContent(
        strings('money.onboarding.step_1.cta'),
      );
    });

    it('navigates to ADD_MONEY_SHEET when Add funds CTA is pressed', () => {
      setupDefaultMocks({ currentStep: 0 });

      const { getByTestId } = render(<MoneyOnboardingCard />);
      fireEvent.press(getByTestId('money-onboarding-card-cta-button'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
      });
    });
  });

  describe('step 1 — has crypto but no mUSD', () => {
    it('renders the crypto description variant', () => {
      setupDefaultMocks({
        currentStep: 0,
        musdBalance: '0',
        tokens: [{ fiat: { balance: '100' } }],
      });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(
        getByTestId('money-onboarding-card-description'),
      ).toHaveTextContent(
        strings('money.onboarding.step_1.description_has_crypto_no_musd', {
          cryptoAmountFiatFormatted: '$100.00',
        }),
      );
    });

    it('renders the tooltip icon when crypto balance is present and no mUSD balance', () => {
      setupDefaultMocks({
        currentStep: 0,
        musdBalance: '0',
        tokens: [{ fiat: { balance: '100' } }],
      });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(
        getByTestId('money-onboarding-card-description-tooltip'),
      ).toBeOnTheScreen();
    });

    it('navigates to APY_INFO_SHEET when tooltip icon is pressed', () => {
      setupDefaultMocks({
        currentStep: 0,
        musdBalance: '0',
        tokens: [{ fiat: { balance: '100' } }],
      });

      const { getByTestId } = render(<MoneyOnboardingCard />);
      fireEvent.press(getByTestId('money-onboarding-card-description-tooltip'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.APY_INFO_SHEET,
        params: { apy: 4 },
      });
    });
  });

  describe('step 1 — has mUSD balance', () => {
    it('renders the mUSD description variant', () => {
      setupDefaultMocks({
        currentStep: 0,
        musdBalance: '50.123456',
        tokens: [],
      });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(
        getByTestId('money-onboarding-card-description'),
      ).toHaveTextContent(
        strings('money.onboarding.step_1.description_has_musd', {
          musdTokenAmountFormatted: '50.12',
        }),
      );
    });

    it('renders the tooltip icon when user has mUSD balance', () => {
      setupDefaultMocks({
        currentStep: 0,
        musdBalance: '50.123456',
        tokens: [],
      });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(
        getByTestId('money-onboarding-card-description-tooltip'),
      ).toBeOnTheScreen();
    });
  });

  describe('step 2 — no cardholder (default variant)', () => {
    it('renders step 2 CTA label when currentStep is 2', () => {
      setupDefaultMocks({ currentStep: 1, isCardholder: false });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(
        getByTestId('money-onboarding-card-description'),
      ).toHaveTextContent(
        strings('money.onboarding.step_2.no_card_account.description'),
      );
    });

    it('renders the Get card primary CTA', () => {
      setupDefaultMocks({ currentStep: 1, isCardholder: false });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(getByTestId('money-onboarding-card-cta-button')).toHaveTextContent(
        strings('money.onboarding.step_2.no_card_account.cta_primary'),
      );
    });

    it('renders the Skip secondary CTA', () => {
      setupDefaultMocks({ currentStep: 1, isCardholder: false });

      const { getByText } = render(<MoneyOnboardingCard />);

      expect(
        getByText(
          strings('money.onboarding.step_2.no_card_account.cta_secondary'),
        ),
      ).toBeOnTheScreen();
    });

    it('navigates to CARD.ROOT when Get card CTA is pressed', () => {
      setupDefaultMocks({ currentStep: 1, isCardholder: false });

      const { getByTestId } = render(<MoneyOnboardingCard />);
      fireEvent.press(getByTestId('money-onboarding-card-cta-button'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT);
    });

    it('calls incrementStep when Skip CTA is pressed', () => {
      setupDefaultMocks({ currentStep: 1, isCardholder: false });

      const { getByText } = render(<MoneyOnboardingCard />);
      fireEvent.press(
        getByText(
          strings('money.onboarding.step_2.no_card_account.cta_secondary'),
        ),
      );

      expect(mockIncrementStep).toHaveBeenCalledTimes(1);
    });
  });

  describe('step 2 — cardholder with no linked card', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders the unlinked-card title', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardholder: true,
        moneyAccountCardToken: null,
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
        moneyAccountCardToken: null,
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
        moneyAccountCardToken: null,
      });

      const { getByTestId } = render(<MoneyOnboardingCard />);

      expect(getByTestId('money-onboarding-card-cta-button')).toHaveTextContent(
        strings('money.onboarding.step_2.unlinked_card_account.cta_primary'),
      );
    });

    it('calls openLinkCardSheet when Link card CTA is pressed and canLink is true', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardholder: true,
        moneyAccountCardToken: null,
        canLink: true,
      });

      const { getByTestId } = render(<MoneyOnboardingCard />);
      fireEvent.press(getByTestId('money-onboarding-card-cta-button'));

      expect(mockOpenLinkCardSheet).toHaveBeenCalledTimes(1);
    });

    it('navigates to CARD.ROOT with CARD.HOME when Link card CTA is pressed and canLink is false', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardholder: true,
        moneyAccountCardToken: null,
        canLink: false,
      });

      const { getByTestId } = render(<MoneyOnboardingCard />);
      fireEvent.press(getByTestId('money-onboarding-card-cta-button'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
      });
    });

    it('calls incrementStep when Skip CTA is pressed', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardholder: true,
        moneyAccountCardToken: null,
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
    it('calls incrementStep on mount when cardholder already has a linked card token', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardholder: true,
        moneyAccountCardToken: 'tok_123',
      });

      render(<MoneyOnboardingCard />);

      expect(mockIncrementStep).toHaveBeenCalledTimes(1);
    });

    it('does not call incrementStep when cardholder has no linked card token', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardholder: true,
        moneyAccountCardToken: null,
      });

      render(<MoneyOnboardingCard />);

      expect(mockIncrementStep).not.toHaveBeenCalled();
    });

    it('does not call incrementStep when user is not a cardholder', () => {
      setupDefaultMocks({
        currentStep: 1,
        isCardholder: false,
        moneyAccountCardToken: 'tok_123',
      });

      render(<MoneyOnboardingCard />);

      expect(mockIncrementStep).not.toHaveBeenCalled();
    });

    it('does not call incrementStep when currentStep is not 1', () => {
      setupDefaultMocks({
        currentStep: 0,
        isCardholder: true,
        moneyAccountCardToken: 'tok_123',
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
