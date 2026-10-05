import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ToastContext } from '../../../component-library/components/Toast';
import { IconName } from '../../../component-library/components/Icons/Icon';
import ProHub from './ProHub';
import { ProHubTestIds } from './ProHub.testIds';
import {
  ADD_FUNDS_DEMO_DELAY_MS,
  ALSO_INCLUDED_ITEMS,
  AddFundsDemoOutcome,
  MembershipBannerKind,
  MOCK_PRO_HUB_STATS,
  MOCK_TRADE_ALLOWANCES,
  TRADE_ALLOWANCE_IDS,
} from './ProHub.constants';
import {
  proDemoAddFundsOutcomeTestId,
  proDemoSwitcherOptionTestId,
} from './components/ProDemoBannerSwitcher/ProDemoBannerSwitcher';
import { formatMembershipDueDate } from './components/MembershipBanner';
import { MemberPricingOnTradesTestIds } from './components/MemberPricingOnTrades';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import {
  MoneyAccountPlusBenefitsStatus,
  useMoneyAccountPlusBenefits,
} from './hooks/useMoneyAccountPlusBenefits';

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

// ─── Plus benefits ────────────────────────────────────────────────────────────

const mockUseMoneyAccountPlusBenefits = jest.mocked(
  useMoneyAccountPlusBenefits,
);
jest.mock('./hooks/useMoneyAccountPlusBenefits', () => ({
  ...jest.requireActual('./hooks/useMoneyAccountPlusBenefits'),
  useMoneyAccountPlusBenefits: jest.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();

const renderProHub = () =>
  render(
    <ToastContext.Provider
      value={{
        toastRef: {
          current: { showToast: mockShowToast, closeToast: mockCloseToast },
        },
      }}
    >
      <ProHub />
    </ToastContext.Provider>,
  );

/**
 * Escapes all regex special characters so a plain string can be used
 * as a partial-match pattern inside toHaveTextContent().
 */
const toRegex = (s: string) =>
  new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

const TRADE_ALLOWANCE_ID_LIST = Object.values(TRADE_ALLOWANCE_IDS);

// CV cannot cover this screen yet: it is still mock-data UI with no Redux /
// Engine state, so focused unit tests remain the coverage layer.

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('ProHub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack = jest.fn();
    mockNavigate = jest.fn();
    mockShowToast.mockReset();
    mockCloseToast.mockReset();
    mockUseMoneyAccountPlusBenefits.mockReturnValue({
      status: MoneyAccountPlusBenefitsStatus.Ready,
      items: MOCK_TRADE_ALLOWANCES,
      resetsOn: 'Sep 15',
      retry: jest.fn(),
    });
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

    it('renders membership card, lifetime earnings, and stat rows', () => {
      const { getByTestId } = renderProHub();

      const membershipBanner = getByTestId(ProHubTestIds.MEMBERSHIP_BANNER);
      const lifetimeEarningsSection = getByTestId(
        ProHubTestIds.LIFETIME_EARNINGS_SECTION,
      );
      const moneyBalanceRow = getByTestId(ProHubTestIds.MONEY_BALANCE_ROW);
      const musdBackRow = getByTestId(ProHubTestIds.MUSD_BACK_ROW);

      expect(membershipBanner).toHaveTextContent(
        toRegex(strings('pro_hub.title')),
      );
      expect(membershipBanner).toHaveTextContent(
        toRegex(strings('pro_hub.membership_status.active')),
      );
      expect(lifetimeEarningsSection).toHaveTextContent(
        toRegex(strings('pro_hub.lifetime_earnings')),
      );
      expect(moneyBalanceRow).toHaveTextContent(
        toRegex(
          strings('pro_hub.money_balance', {
            apy: `${MOCK_PRO_HUB_STATS.moneyBalanceApy}%`,
          }),
        ),
      );
      expect(musdBackRow).toHaveTextContent(
        toRegex(
          strings('pro_hub.musd_back', {
            rate: `${MOCK_PRO_HUB_STATS.musdBackRate}%`,
          }),
        ),
      );
    });

    it('renders the add funds alert with MM/DD/YYYY due date, description, and action', () => {
      const { getByTestId } = renderProHub();

      const banner = getByTestId(ProHubTestIds.MEMBERSHIP_ALERT_BANNER);
      const actionButton = getByTestId(ProHubTestIds.MEMBERSHIP_ALERT_ACTION);

      expect(banner).toHaveTextContent(
        toRegex(
          strings('pro_hub.membership_alert.low_balance.title', {
            date: formatMembershipDueDate(MOCK_PRO_HUB_STATS.addFundsDueDate),
          }),
        ),
      );
      expect(banner).toHaveTextContent(
        toRegex(strings('pro_hub.membership_alert.low_balance.description')),
      );
      expect(actionButton).toHaveTextContent(
        strings('pro_hub.membership_alert.low_balance.action'),
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

    it('renders the member pricing section title', () => {
      const { getByTestId } = renderProHub();

      const section = getByTestId(MemberPricingOnTradesTestIds.SECTION);
      const title = getByTestId(MemberPricingOnTradesTestIds.TITLE);

      expect(section).toBeOnTheScreen();
      expect(title).toHaveTextContent(strings('pro_hub.member_pricing.title'));

      TRADE_ALLOWANCE_ID_LIST.forEach((id) => {
        const row = getByTestId(MemberPricingOnTradesTestIds.ROW(id));
        const progress = getByTestId(MemberPricingOnTradesTestIds.PROGRESS(id));

        expect(row).toBeOnTheScreen();
        expect(progress).toBeOnTheScreen();
        expect(row).toHaveTextContent(
          toRegex(strings(`pro_hub.member_pricing.${id}.label`)),
        );
      });
    });

    it('renders next payment text and manage plan button', () => {
      const { getByTestId } = renderProHub();

      expect(
        getByTestId(ProHubTestIds.ALSO_INCLUDED_SECTION),
      ).toBeOnTheScreen();

      ALSO_INCLUDED_ITEMS.forEach((item) => {
        const row = getByTestId(ProHubTestIds.ALSO_INCLUDED_ROW(item.id));

        expect(row).toBeOnTheScreen();
        expect(row).toHaveTextContent(toRegex(strings(item.titleKey)));
        expect(row).toHaveTextContent(toRegex(strings(item.subtitleKey)));

        if (item.badgeKey) {
          expect(row).toHaveTextContent(toRegex(strings(item.badgeKey)));
        }
      });

      expect(getByTestId(ProHubTestIds.DISCLAIMER_TEXT)).toHaveTextContent(
        strings('pro_hub.also_included.disclaimer'),
      );
      expect(getByTestId(ProHubTestIds.MANAGE_BUTTON)).toHaveTextContent(
        strings('pro_hub.manage_membership'),
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

    it('does not call navigation.goBack on initial render', () => {
      renderProHub();

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  // ── Add funds toast ──────────────────────────────────────────────────────

  describe('add funds toast', () => {
    it('shows a processing toast and then a funds added toast', () => {
      jest.useFakeTimers();
      try {
        const { getByTestId } = renderProHub();

        fireEvent.press(getByTestId(ProHubTestIds.MEMBERSHIP_ALERT_ACTION));

        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            hasNoTimeout: true,
            labelOptions: [
              {
                label: strings('pro_hub.add_funds_toast.adding_title'),
                isBold: true,
              },
            ],
            descriptionOptions: {
              description: strings(
                'pro_hub.add_funds_toast.adding_description',
              ),
            },
          }),
        );

        act(() => {
          jest.advanceTimersByTime(ADD_FUNDS_DEMO_DELAY_MS);
        });

        expect(mockShowToast).toHaveBeenLastCalledWith(
          expect.objectContaining({
            iconName: IconName.Confirmation,
            labelOptions: [
              {
                label: strings('pro_hub.add_funds_toast.added_title'),
                isBold: true,
              },
            ],
          }),
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('shows a processing toast and then the payment failure sheet', () => {
      jest.useFakeTimers();
      try {
        const { getByTestId } = renderProHub();

        fireEvent.press(
          getByTestId(proDemoAddFundsOutcomeTestId(AddFundsDemoOutcome.Failed)),
        );
        fireEvent.press(getByTestId(ProHubTestIds.MEMBERSHIP_ALERT_ACTION));

        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            labelOptions: [
              {
                label: strings('pro_hub.add_funds_toast.adding_title'),
                isBold: true,
              },
            ],
          }),
        );

        act(() => {
          jest.advanceTimersByTime(ADD_FUNDS_DEMO_DELAY_MS);
        });

        expect(mockCloseToast).toHaveBeenCalled();
        expect(
          getByTestId(ProHubTestIds.PAYMENT_FAILURE_SHEET),
        ).toBeOnTheScreen();
        expect(
          getByTestId(ProHubTestIds.PAYMENT_FAILURE_TITLE),
        ).toHaveTextContent(
          strings('pro_hub.membership_alert.payment_failed.title'),
        );
        expect(
          getByTestId(ProHubTestIds.PAYMENT_FAILURE_DESCRIPTION),
        ).toHaveTextContent(
          strings('pro_hub.membership_alert.payment_failed.description'),
        );
        expect(
          getByTestId(ProHubTestIds.PAYMENT_FAILURE_TRY_AGAIN),
        ).toHaveTextContent(strings('pro_hub.add_funds_toast.failed_action'));
      } finally {
        jest.useRealTimers();
      }
    });

    it('restarts the adding funds toast when try again is pressed', () => {
      jest.useFakeTimers();
      try {
        const { getByTestId } = renderProHub();

        fireEvent.press(
          getByTestId(proDemoAddFundsOutcomeTestId(AddFundsDemoOutcome.Failed)),
        );
        fireEvent.press(getByTestId(ProHubTestIds.MEMBERSHIP_ALERT_ACTION));
        act(() => {
          jest.advanceTimersByTime(ADD_FUNDS_DEMO_DELAY_MS);
        });

        mockShowToast.mockClear();
        fireEvent.press(getByTestId(ProHubTestIds.PAYMENT_FAILURE_TRY_AGAIN));

        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            labelOptions: [
              {
                label: strings('pro_hub.add_funds_toast.adding_title'),
                isBold: true,
              },
            ],
          }),
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('does not show the add funds toast for renew membership', () => {
      const { getByTestId } = renderProHub();

      fireEvent.press(
        getByTestId(
          proDemoSwitcherOptionTestId(MembershipBannerKind.Cancelled),
        ),
      );
      fireEvent.press(getByTestId(ProHubTestIds.MEMBERSHIP_ALERT_ACTION));

      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  // ── Navigation ───────────────────────────────────────────────────────────

  describe('navigation', () => {
    it('navigates to Membership when manage membership is pressed', () => {
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

    it('does not navigate on initial render', () => {
      renderProHub();

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
