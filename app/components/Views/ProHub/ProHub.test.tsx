import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProHub from './ProHub';
import { ProHubTestIds } from './ProHub.testIds';
import { MOCK_NEXT_PAYMENT, MOCK_PRO_HUB_STATS } from './ProHub.constants';
import { BENEFITS, BenefitRowTestIds } from '../shared/pro';
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
    it('renders the pro hub container', () => {
      const { getByTestId } = renderProHub();

      const container = getByTestId(ProHubTestIds.CONTAINER);

      expect(container).toBeOnTheScreen();
    });

    it('renders the title from i18n', () => {
      const { getByTestId } = renderProHub();

      const header = getByTestId(ProHubTestIds.HEADER_ROOT);

      expect(header).toHaveTextContent(strings('pro_hub.title'));
    });

    it('renders the header bar', () => {
      const { getByTestId } = renderProHub();

      const header = getByTestId(ProHubTestIds.HEADER_ROOT);

      expect(header).toBeOnTheScreen();
    });

    it('renders the back button in the header', () => {
      const { getByTestId } = renderProHub();

      const backButton = getByTestId(ProHubTestIds.BACK_BUTTON);

      expect(backButton).toBeOnTheScreen();
    });

    it('renders the manage plans icon button', () => {
      const { getByTestId } = renderProHub();

      const managePlansButton = getByTestId(ProHubTestIds.MANAGE_PLANS_BUTTON);

      expect(managePlansButton).toBeOnTheScreen();
    });

    it('renders membership card, lifetime earnings, and stat rows with mock amounts', () => {
      const { getByTestId } = renderProHub();

      const membershipBanner = getByTestId(ProHubTestIds.MEMBERSHIP_BANNER);
      const lifetimeEarningsSection = getByTestId(
        ProHubTestIds.LIFETIME_EARNINGS_SECTION,
      );
      const moneyBalanceRow = getByTestId(ProHubTestIds.MONEY_BALANCE_ROW);
      const musdBackRow = getByTestId(ProHubTestIds.MUSD_BACK_ROW);

      expect(membershipBanner).toHaveTextContent(
        toRegex(strings('pro_hub.membership_brand')),
      );
      expect(membershipBanner).toHaveTextContent(
        toRegex(strings('pro_hub.membership_label')),
      );
      expect(lifetimeEarningsSection).toHaveTextContent(
        toRegex(strings('pro_hub.lifetime_earnings')),
      );
      expect(lifetimeEarningsSection).toHaveTextContent(
        toRegex(MOCK_PRO_HUB_STATS.lifetimeEarnings),
      );
      expect(moneyBalanceRow).toHaveTextContent(
        toRegex(strings('pro_hub.money_balance')),
      );
      expect(moneyBalanceRow).toHaveTextContent(
        toRegex(MOCK_PRO_HUB_STATS.moneyBalance),
      );
      expect(musdBackRow).toHaveTextContent(toRegex(strings('pro_hub.musd_back')));
      expect(musdBackRow).toHaveTextContent(
        toRegex(MOCK_PRO_HUB_STATS.musdBack),
      );
    });

    it('renders the physical card banner with title and description', () => {
      const { getByTestId } = renderProHub();

      const banner = getByTestId(ProHubTestIds.PHYSICAL_CARD_BANNER);
      const title = getByTestId(ProHubTestIds.PHYSICAL_CARD_TITLE);
      const description = getByTestId(ProHubTestIds.PHYSICAL_CARD_DESCRIPTION);

      expect(banner).toBeOnTheScreen();
      expect(title).toHaveTextContent(strings('pro_hub.physical_card.title'));
      expect(description).toHaveTextContent(
        strings('pro_hub.physical_card.description'),
      );
    });

    it('renders all benefit rows with correct titles', () => {
      const { getByTestId } = renderProHub();

      BENEFITS.forEach((benefit) => {
        const row = getByTestId(BenefitRowTestIds.ROW(benefit.id));

        expect(row).toBeOnTheScreen();
        expect(row).toHaveTextContent(toRegex(strings(benefit.title)));
      });
    });

    it('renders next payment amount, date, and manage plan button', () => {
      const { getByTestId } = renderProHub();

      const nextPaymentText = getByTestId(ProHubTestIds.NEXT_PAYMENT_TEXT);
      const manageButton = getByTestId(ProHubTestIds.MANAGE_BUTTON);

      expect(nextPaymentText).toHaveTextContent(
        strings('pro_hub.next_payment', {
          amount: MOCK_NEXT_PAYMENT.amount,
          date: MOCK_NEXT_PAYMENT.date,
        }),
      );
      expect(manageButton).toHaveTextContent(strings('pro_hub.manage_plan'));
    });
  });

  // ── Back button ───────────────────────────────────────────────────────────

  describe('back button', () => {
    it('calls navigation.goBack when pressed', () => {
      const { getByTestId } = renderProHub();

      fireEvent.press(getByTestId(ProHubTestIds.BACK_BUTTON));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not call navigation.goBack on initial render', () => {
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

    it('navigates to Card when physical card banner is pressed', () => {
      const { getByTestId } = renderProHub();

      fireEvent.press(getByTestId(ProHubTestIds.PHYSICAL_CARD_BANNER));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT);
    });

    it('does not navigate when a benefit row is pressed', () => {
      const { getByTestId } = renderProHub();

      fireEvent.press(getByTestId(BenefitRowTestIds.ROW(BENEFITS[0].id)));

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not navigate on initial render', () => {
      renderProHub();

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
