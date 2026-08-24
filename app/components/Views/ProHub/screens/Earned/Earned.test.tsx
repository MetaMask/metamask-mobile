import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Earned from './Earned';
import { EarnedTestIds } from './Earned.testIds';
import { MOCK_EARNED_DATA } from './Earned.constants';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';

// ─── Navigation ───────────────────────────────────────────────────────────────

let mockGoBack: jest.Mock;
let mockNavigate: jest.Mock;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  };
});

// ─── Tailwind ─────────────────────────────────────────────────────────────────

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (..._args: unknown[]) => ({}),
  }),
}));

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => true),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderEarned = () => render(<Earned />);

/**
 * Escapes all regex special characters so a plain string can be used
 * as a partial-match pattern inside toHaveTextContent().
 */
const toRegex = (s: string) =>
  new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

// CV cannot cover this screen yet: it is still mock-data UI with no Redux /
// Engine state, so focused unit tests remain the coverage layer.

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Earned', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack = jest.fn();
    mockNavigate = jest.fn();
  });

  describe('Rendering', () => {
    it('renders the earned screen container', () => {
      const { getByTestId } = renderEarned();

      const container = getByTestId(EarnedTestIds.CONTAINER);

      expect(container).toBeOnTheScreen();
    });

    it('renders the back button in the header', () => {
      const { getByTestId } = renderEarned();

      const backButton = getByTestId(EarnedTestIds.BACK_BUTTON);

      expect(backButton).toBeOnTheScreen();
    });

    it('renders the lifetime earned total and label from mock data', () => {
      const { getByTestId } = renderEarned();

      const totalValue = getByTestId(EarnedTestIds.TOTAL_VALUE);
      const totalLabel = getByTestId(EarnedTestIds.TOTAL_LABEL);

      expect(totalValue).toHaveTextContent(toRegex(MOCK_EARNED_DATA.total));
      expect(totalLabel).toHaveTextContent(
        strings('pro_hub.earned.total_label'),
      );
    });

    it('renders the interest breakdown row with title and amount', () => {
      const { getByTestId } = renderEarned();

      const interestRow = getByTestId(EarnedTestIds.INTEREST_ROW);

      expect(interestRow).toHaveTextContent(
        toRegex(strings('pro_hub.earned.interest_title')),
      );
      expect(interestRow).toHaveTextContent(
        toRegex(MOCK_EARNED_DATA.interest.amount),
      );
    });

    it('renders the card cashback row with title, subtitle, and amount', () => {
      const { getByTestId } = renderEarned();

      const cashbackRow = getByTestId(EarnedTestIds.CARD_CASHBACK_ROW);

      expect(cashbackRow).toHaveTextContent(
        toRegex(strings('pro_hub.earned.card_cashback_title')),
      );
      expect(cashbackRow).toHaveTextContent(
        toRegex(MOCK_EARNED_DATA.cardCashback.amount),
      );
      expect(cashbackRow).toHaveTextContent(
        toRegex(
          strings('pro_hub.earned.card_cashback_subtitle', {
            amount: MOCK_EARNED_DATA.cardCashbackSpend,
          }),
        ),
      );
    });

    it('renders the paid-for-itself title, ticker value, and fee description', () => {
      const { getByTestId } = renderEarned();

      const title = getByTestId(EarnedTestIds.PAID_FOR_ITSELF_TITLE);
      const value = getByTestId(EarnedTestIds.PAID_FOR_ITSELF_VALUE);
      const description = getByTestId(
        EarnedTestIds.PAID_FOR_ITSELF_DESCRIPTION,
      );

      expect(title).toHaveTextContent(
        strings('pro_hub.earned.paid_for_itself_title'),
      );
      expect(value).toHaveTextContent(
        toRegex(MOCK_EARNED_DATA.paidForItself),
      );
      expect(description).toHaveTextContent(
        strings('pro_hub.earned.paid_for_itself_description', {
          multiplier: MOCK_EARNED_DATA.membershipFeeMultiplier,
          fee: MOCK_EARNED_DATA.membershipFee,
        }),
      );
    });

    it('renders the grow-your-balance copy and add money button label', () => {
      const { getByTestId } = renderEarned();

      const growTitle = getByTestId(EarnedTestIds.GROW_TITLE);
      const growDescription = getByTestId(EarnedTestIds.GROW_DESCRIPTION);
      const addMoneyButton = getByTestId(EarnedTestIds.ADD_MONEY_BUTTON);

      expect(growTitle).toHaveTextContent(
        strings('pro_hub.earned.grow_title'),
      );
      expect(growDescription).toHaveTextContent(
        strings('pro_hub.earned.grow_description'),
      );
      expect(addMoneyButton).toHaveTextContent(
        strings('pro_hub.earned.add_money'),
      );
    });
  });

  describe('back button', () => {
    it('calls navigation.goBack when pressed', () => {
      const { getByTestId } = renderEarned();

      fireEvent.press(getByTestId(EarnedTestIds.BACK_BUTTON));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not call navigation.goBack on initial render', () => {
      renderEarned();

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('add money button', () => {
    it('does not navigate when add money is pressed', () => {
      const { getByTestId } = renderEarned();

      fireEvent.press(getByTestId(EarnedTestIds.ADD_MONEY_BUTTON));

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('does not navigate on initial render', () => {
      renderEarned();

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
