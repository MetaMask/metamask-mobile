import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Saved from './Saved';
import { SavedTestIds } from './Saved.testIds';
import { MOCK_SAVED_DATA } from './Saved.constants';
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

const renderSaved = () => render(<Saved />);

/**
 * Escapes all regex special characters so a plain string can be used
 * as a partial-match pattern inside toHaveTextContent().
 */
const toRegex = (s: string) =>
  new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

// CV cannot cover this screen yet: it is still mock-data UI with no Redux /
// Engine state, so focused unit tests remain the coverage layer.

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Saved', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack = jest.fn();
    mockNavigate = jest.fn();
  });

  describe('Rendering', () => {
    it('renders the container', () => {
      const { getByTestId } = renderSaved();

      expect(getByTestId(SavedTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('renders the back button', () => {
      const { getByTestId } = renderSaved();

      expect(getByTestId(SavedTestIds.BACK_BUTTON)).toBeOnTheScreen();
    });

    it('renders the lifetime saved total and label', () => {
      const { getByTestId } = renderSaved();

      expect(getByTestId(SavedTestIds.TOTAL_VALUE)).toHaveTextContent(
        toRegex(MOCK_SAVED_DATA.total),
      );
      expect(getByTestId(SavedTestIds.TOTAL_LABEL)).toHaveTextContent(
        strings('pro_hub.saved.total_label'),
      );
    });

    it('renders the trading fees breakdown row', () => {
      const { getByTestId } = renderSaved();

      expect(getByTestId(SavedTestIds.TRADING_FEES_ROW)).toHaveTextContent(
        toRegex(strings('pro_hub.saved.trading_fees_title')),
      );
      expect(getByTestId(SavedTestIds.TRADING_FEES_ROW)).toHaveTextContent(
        toRegex(MOCK_SAVED_DATA.tradingFees.amount),
      );
    });

    it('renders the card and ATM fees breakdown row', () => {
      const { getByTestId } = renderSaved();

      expect(getByTestId(SavedTestIds.CARD_ATM_FEES_ROW)).toHaveTextContent(
        toRegex(strings('pro_hub.saved.card_atm_fees_title')),
      );
      expect(getByTestId(SavedTestIds.CARD_ATM_FEES_ROW)).toHaveTextContent(
        toRegex(MOCK_SAVED_DATA.cardAndAtmFees.amount),
      );
    });

    it('renders the included coverage row as active', () => {
      const { getByTestId } = renderSaved();

      expect(getByTestId(SavedTestIds.COVERAGE_ROW)).toHaveTextContent(
        toRegex(strings('pro_hub.saved.coverage_title')),
      );
      expect(getByTestId(SavedTestIds.COVERAGE_ROW)).toHaveTextContent(
        toRegex(strings('pro_hub.saved.coverage_active')),
      );
    });

    it('renders the paid-for-itself section', () => {
      const { getByTestId } = renderSaved();

      expect(getByTestId(SavedTestIds.PAID_FOR_ITSELF_TITLE)).toHaveTextContent(
        strings('pro_hub.saved.paid_for_itself_title'),
      );
      expect(getByTestId(SavedTestIds.PAID_FOR_ITSELF_VALUE)).toHaveTextContent(
        toRegex(MOCK_SAVED_DATA.paidForItself),
      );
      expect(
        getByTestId(SavedTestIds.PAID_FOR_ITSELF_DESCRIPTION),
      ).toHaveTextContent(
        strings('pro_hub.saved.paid_for_itself_description', {
          multiplier: MOCK_SAVED_DATA.membershipFeeMultiplier,
          fee: MOCK_SAVED_DATA.membershipFee,
        }),
      );
    });

    it('renders the swaps promo section and swap button', () => {
      const { getByTestId } = renderSaved();

      expect(getByTestId(SavedTestIds.SWAPS_PROMO_TITLE)).toHaveTextContent(
        strings('pro_hub.saved.swaps_promo_title'),
      );
      expect(
        getByTestId(SavedTestIds.SWAPS_PROMO_DESCRIPTION),
      ).toHaveTextContent(strings('pro_hub.saved.swaps_promo_description'));
      expect(getByTestId(SavedTestIds.SWAP_BUTTON)).toHaveTextContent(
        strings('pro_hub.saved.swap'),
      );
    });
  });

  describe('back button', () => {
    it('calls navigation.goBack when pressed', () => {
      const { getByTestId } = renderSaved();

      fireEvent.press(getByTestId(SavedTestIds.BACK_BUTTON));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not call navigation.goBack before the button is pressed', () => {
      renderSaved();

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('navigates to Swap when the swap button is pressed', () => {
      const { getByTestId } = renderSaved();

      fireEvent.press(getByTestId(SavedTestIds.SWAP_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.ROOT, {
        screen: Routes.BRIDGE.BRIDGE_VIEW,
      });
    });

    it('does not navigate before any button is pressed', () => {
      renderSaved();

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
