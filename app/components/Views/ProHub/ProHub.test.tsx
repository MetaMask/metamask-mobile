import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProHub from './ProHub';
import { ProHubTestIds } from './ProHub.testIds';
import { EntitlementsTestIds } from './components/Entitlements';
import { BENEFITS } from '../shared/pro/benefits.constants';
import { HUB_BENEFIT_ROWS } from '../shared/pro/entitlements.constants';
import { MOCK_MEMBER_SINCE } from './ProHub.constants';
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

const TRADE_ALLOWANCE_IDS = ['swaps', 'perps', 'predict'] as const;

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

    /*
     * The header carries no title: "Orange" is stated once, large, by the
     * identity block below it. A header title would repeat it.
     */
    it('renders no title in the header', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(ProHubTestIds.HEADER_ROOT)).not.toHaveTextContent(
        toRegex(strings('pro_hub.title')),
      );
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

    it('does not render a settings affordance in the header', () => {
      const { queryByTestId } = renderProHub();

      expect(
        queryByTestId(ProHubTestIds.MANAGE_PLANS_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('renders the member identity with the date they joined', () => {
      const { getByTestId } = renderProHub();

      const identity = getByTestId(ProHubTestIds.MEMBERSHIP_BANNER);

      expect(identity).toHaveTextContent(
        toRegex(strings('pro_hub.membership_label')),
      );
      expect(identity).toHaveTextContent(
        toRegex(strings('pro_hub.member_since', { date: MOCK_MEMBER_SINCE })),
      );
    });

    /*
     * The earnings figures now live on the benefit rows that produce them, so
     * the identity block leads straight into the benefits.
     */
    it('states the Money balance earnings on the Boosted APY row', () => {
      const { getByTestId } = renderProHub();

      expect(
        getByTestId(EntitlementsTestIds.SUBLABEL('apy')),
      ).toHaveTextContent(toRegex('+$48.92'));
    });

    it('shows each rate as a badge beside its label', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(EntitlementsTestIds.BADGE('apy'))).toHaveTextContent(
        strings('pro_hub.entitlements.apy.badge'),
      );
      expect(
        getByTestId(EntitlementsTestIds.BADGE('cashback')),
      ).toHaveTextContent(strings('pro_hub.entitlements.cashback.badge'));
    });

    /*
     * The regression that matters most on this screen: the hub used to render
     * only the benefits carrying a currency figure, so protection, ATM/FX,
     * support and the app icon appeared nowhere. Asserting that every
     * `BenefitId` is covered means adding a benefit to the upsell fails here
     * until the members' area acknowledges it.
     */
    it('covers every benefit sold on the upsell', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(EntitlementsTestIds.SECTION)).toBeOnTheScreen();
      expect(getByTestId(EntitlementsTestIds.TITLE)).toHaveTextContent(
        strings('pro_hub.entitlements.title'),
      );

      const coveredBenefits = new Set(
        HUB_BENEFIT_ROWS.map((row) => row.benefitId),
      );
      BENEFITS.forEach(({ id }) => {
        expect(coveredBenefits.has(id)).toBe(true);
      });
    });

    it('renders every row with its label and sublabel', () => {
      const { getByTestId } = renderProHub();

      HUB_BENEFIT_ROWS.forEach((row) => {
        expect(getByTestId(EntitlementsTestIds.ROW(row.id))).toHaveTextContent(
          toRegex(strings(row.labelKey)),
        );
        expect(
          getByTestId(EntitlementsTestIds.SUBLABEL(row.id)),
        ).toBeOnTheScreen();
      });
    });

    /*
     * Member pricing fans out into its three markets, and only consumable
     * benefits get a bar — a standing right has nothing to draw down.
     */
    it('renders a bar for the consumable benefits only', () => {
      const { getByTestId, queryByTestId } = renderProHub();

      const withBars = HUB_BENEFIT_ROWS.filter((row) => row.allowance).map(
        (row) => row.id,
      );
      expect(withBars).toEqual([...TRADE_ALLOWANCE_IDS, 'protection']);

      HUB_BENEFIT_ROWS.forEach((row) => {
        const meter = queryByTestId(EntitlementsTestIds.METER(row.id));
        if (row.allowance) {
          expect(meter).toBeOnTheScreen();
          expect(
            getByTestId(EntitlementsTestIds.METER_FILL(row.id)),
          ).toBeOnTheScreen();
        } else {
          expect(meter).toBeNull();
        }
      });
    });

    it('states what is left of an allowance, not what is spent', () => {
      const { getByTestId } = renderProHub();

      // $310 of $500 used, so $190 remains.
      expect(
        getByTestId(EntitlementsTestIds.SUBLABEL('swaps')),
      ).toHaveTextContent(toRegex('$190 of $500'));
    });

    it('offers a trailing action on the rows that need one', () => {
      const { getByTestId } = renderProHub();

      expect(
        getByTestId(EntitlementsTestIds.ACTION('get_card')),
      ).toHaveTextContent(strings('pro_hub.entitlements.get_card.action'));
      expect(
        getByTestId(EntitlementsTestIds.ACTION('app_icon')),
      ).toHaveTextContent(strings('pro_hub.entitlements.app_icon.action'));
    });

    it('renders next payment text and manage plan button', () => {
      const { getByTestId } = renderProHub();

      const nextPaymentText = getByTestId(ProHubTestIds.NEXT_PAYMENT_TEXT);
      const manageButton = getByTestId(ProHubTestIds.MANAGE_BUTTON);

      expect(nextPaymentText).toBeOnTheScreen();
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

    it('navigates to Card from the order-your-card action', () => {
      const { getByTestId } = renderProHub();

      fireEvent.press(getByTestId(EntitlementsTestIds.ACTION('get_card')));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT);
    });

    it('does not navigate on initial render', () => {
      renderProHub();

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
