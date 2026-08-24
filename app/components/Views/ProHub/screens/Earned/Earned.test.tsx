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
    it('renders the container', () => {
      const { getByTestId } = renderEarned();

      expect(getByTestId(EarnedTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('renders the back button', () => {
      const { getByTestId } = renderEarned();

      expect(getByTestId(EarnedTestIds.BACK_BUTTON)).toBeOnTheScreen();
    });

    it('renders the lifetime earned total and label', () => {
      const { getByTestId } = renderEarned();

      expect(getByTestId(EarnedTestIds.TOTAL_VALUE)).toHaveTextContent(
        toRegex(MOCK_EARNED_DATA.total),
      );
      expect(getByTestId(EarnedTestIds.TOTAL_LABEL)).toHaveTextContent(
        strings('pro_hub.earned.total_label'),
      );
    });

    it('renders the interest breakdown row', () => {
      const { getByTestId } = renderEarned();

      expect(getByTestId(EarnedTestIds.INTEREST_ROW)).toHaveTextContent(
        toRegex(strings('pro_hub.earned.interest_title')),
      );
      expect(getByTestId(EarnedTestIds.INTEREST_ROW)).toHaveTextContent(
        toRegex(MOCK_EARNED_DATA.interest.amount),
      );
    });

    it('renders the card cashback breakdown row', () => {
      const { getByTestId } = renderEarned();

      expect(getByTestId(EarnedTestIds.CARD_CASHBACK_ROW)).toHaveTextContent(
        toRegex(strings('pro_hub.earned.card_cashback_title')),
      );
      expect(getByTestId(EarnedTestIds.CARD_CASHBACK_ROW)).toHaveTextContent(
        toRegex(MOCK_EARNED_DATA.cardCashback.amount),
      );
      expect(getByTestId(EarnedTestIds.CARD_CASHBACK_ROW)).toHaveTextContent(
        toRegex(
          strings('pro_hub.earned.card_cashback_subtitle', {
            amount: MOCK_EARNED_DATA.cardCashbackSpend,
          }),
        ),
      );
    });

    it('renders the paid-for-itself section', () => {
      const { getByTestId } = renderEarned();

      expect(
        getByTestId(EarnedTestIds.PAID_FOR_ITSELF_TITLE),
      ).toHaveTextContent(strings('pro_hub.earned.paid_for_itself_title'));
      expect(
        getByTestId(EarnedTestIds.PAID_FOR_ITSELF_VALUE),
      ).toHaveTextContent(toRegex(MOCK_EARNED_DATA.paidForItself));
      expect(
        getByTestId(EarnedTestIds.PAID_FOR_ITSELF_DESCRIPTION),
      ).toHaveTextContent(
        strings('pro_hub.earned.paid_for_itself_description', {
          multiplier: MOCK_EARNED_DATA.membershipFeeMultiplier,
          fee: MOCK_EARNED_DATA.membershipFee,
        }),
      );
    });

    it('renders the grow-your-balance section and add money button', () => {
      const { getByTestId } = renderEarned();

      expect(getByTestId(EarnedTestIds.GROW_TITLE)).toHaveTextContent(
        strings('pro_hub.earned.grow_title'),
      );
      expect(getByTestId(EarnedTestIds.GROW_DESCRIPTION)).toHaveTextContent(
        strings('pro_hub.earned.grow_description'),
      );
      expect(getByTestId(EarnedTestIds.ADD_MONEY_BUTTON)).toHaveTextContent(
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

    it('does not call navigation.goBack before the button is pressed', () => {
      renderEarned();

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('does not navigate before any button is pressed', () => {
      renderEarned();

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
