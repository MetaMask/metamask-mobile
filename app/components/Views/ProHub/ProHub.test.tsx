import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProHub from './ProHub';
import { ProHubTestIds } from './ProHub.testIds';
import { MOCK_NEXT_PAYMENT, MOCK_PRO_HUB_STATS } from './ProHub.constants';
// eslint-disable-next-line import-x/no-restricted-paths -- ProHub and ProSubscription are the only BenefitRow consumers.
import { BENEFITS } from '../ProSubscription/screens/Benefits/Benefits.constants';
// eslint-disable-next-line import-x/no-restricted-paths -- ProHub and ProSubscription are the only BenefitRow consumers.
import { BenefitsTestIds } from '../ProSubscription/screens/Benefits/Benefits.testIds';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderProHub = () => render(<ProHub />);

/**
 * Escapes all regex special characters so a plain string can be used
 * as a partial-match pattern inside toHaveTextContent().
 */
const toRegex = (s: string) =>
  new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

// CV cannot cover this screen yet: it is still mock-data UI with no Redux /
// Engine state, so focused unit tests remain the coverage layer.

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('ProHub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack = jest.fn();
    mockNavigate = jest.fn();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the container', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(ProHubTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('renders the title from i18n', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(ProHubTestIds.TITLE)).toHaveTextContent(
        strings('pro_hub.title'),
      );
    });

    it('renders the header', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(ProHubTestIds.HEADER_ROOT)).toBeOnTheScreen();
    });

    it('renders the back button', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(ProHubTestIds.BACK_BUTTON)).toBeOnTheScreen();
    });

    it('renders the manage plans button', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(ProHubTestIds.MANAGE_PLANS_BUTTON)).toBeOnTheScreen();
    });

    it('renders earned and saved stat cards', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(ProHubTestIds.EARNED_CARD)).toHaveTextContent(
        toRegex(MOCK_PRO_HUB_STATS.earned),
      );
      expect(getByTestId(ProHubTestIds.SAVED_CARD)).toHaveTextContent(
        toRegex(MOCK_PRO_HUB_STATS.saved),
      );
    });

    it('renders the physical card placeholder and copy', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(ProHubTestIds.CARD_PLACEHOLDER)).toBeOnTheScreen();
      expect(getByTestId(ProHubTestIds.PHYSICAL_CARD_TITLE)).toHaveTextContent(
        strings('pro_hub.physical_card.title'),
      );
      expect(
        getByTestId(ProHubTestIds.PHYSICAL_CARD_DESCRIPTION),
      ).toHaveTextContent(strings('pro_hub.physical_card.description'));
    });

    it('renders the get card button with the i18n label', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(ProHubTestIds.GET_CARD_BUTTON)).toHaveTextContent(
        strings('pro_hub.physical_card.cta'),
      );
    });

    it('renders all benefit rows without making them pressable', () => {
      const { getByTestId } = renderProHub();

      BENEFITS.forEach((benefit) => {
        const row = getByTestId(BenefitsTestIds.BENEFIT_ROW(benefit.id));

        expect(row).toBeOnTheScreen();
        expect(row).toHaveTextContent(toRegex(strings(benefit.title)));
        expect(row.props.accessibilityRole).not.toBe('button');
      });
    });

    it('renders next payment copy and the manage plan button', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(ProHubTestIds.NEXT_PAYMENT_TEXT)).toHaveTextContent(
        strings('pro_hub.next_payment', {
          amount: MOCK_NEXT_PAYMENT.amount,
          date: MOCK_NEXT_PAYMENT.date,
        }),
      );
      expect(getByTestId(ProHubTestIds.MANAGE_BUTTON)).toHaveTextContent(
        strings('pro_hub.manage_plan'),
      );
    });
  });

  // ── Back button ───────────────────────────────────────────────────────────

  describe('back button', () => {
    it('calls navigation.goBack when pressed', () => {
      const { getByTestId } = renderProHub();

      fireEvent.press(getByTestId(ProHubTestIds.BACK_BUTTON));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not call navigation.goBack before the button is pressed', () => {
      renderProHub();

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  // ── Navigation ───────────────────────────────────────────────────────────

  describe('navigation', () => {
    it('navigates to Membership when manage plan is pressed', () => {
      const { getByTestId } = renderProHub();

      fireEvent.press(getByTestId(ProHubTestIds.MANAGE_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PRO_HUB.MEMBERSHIP);
    });

    it('navigates to Membership when manage plans icon is pressed', () => {
      const { getByTestId } = renderProHub();

      fireEvent.press(getByTestId(ProHubTestIds.MANAGE_PLANS_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PRO_HUB.MEMBERSHIP);
    });

    it('navigates to Card when get card is pressed', () => {
      const { getByTestId } = renderProHub();

      fireEvent.press(getByTestId(ProHubTestIds.GET_CARD_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT);
    });

    it('navigates to Earned when the earned card is pressed', () => {
      const { getByTestId } = renderProHub();

      fireEvent.press(getByTestId(ProHubTestIds.EARNED_CARD));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PRO_HUB.EARNED);
    });

    it('navigates to Saved when the saved card is pressed', () => {
      const { getByTestId } = renderProHub();

      fireEvent.press(getByTestId(ProHubTestIds.SAVED_CARD));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PRO_HUB.SAVED);
    });

    it('does not navigate when the physical card is pressed', () => {
      const { getByTestId } = renderProHub();

      fireEvent(getByTestId(ProHubTestIds.CARD_PLACEHOLDER), 'pressIn', {
        nativeEvent: { locationX: 40, locationY: 40 },
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not navigate when a benefit row is pressed', () => {
      const { getByTestId } = renderProHub();

      fireEvent.press(getByTestId(BenefitsTestIds.BENEFIT_ROW(BENEFITS[0].id)));

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not navigate before any button is pressed', () => {
      renderProHub();

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
