import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';
import { IconColor } from '@metamask/design-system-react-native';
import { Provider } from 'react-redux';
import {
  PRODUCT_TYPES,
  SUBSCRIPTION_STATUSES,
  type Subscription,
} from '@metamask/subscription-controller';
import type { RootState } from '../../../reducers';
import configureStore from '../../../util/test/configureStore';
import ProHub from './ProHub';
import { ProHubTestIds } from './ProHub.testIds';
import {
  ALSO_INCLUDED_ITEMS,
  MOCK_PRO_HUB_STATS,
  MOCK_TRADE_ALLOWANCES,
  TRADE_ALLOWANCE_IDS,
} from './ProHub.constants';
import { MemberPricingOnTradesTestIds } from './components/MemberPricingOnTrades';
import {
  getMembershipBannerModel,
  MembershipStatusKind,
} from './components/MembershipBanner/MembershipBanner.utils';
import { useMembershipBannerModel } from './hooks/useMembershipBannerModel';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { MoneyAccountPlusAccess } from '../../../hooks/useMoneyAccountPlusAccess';
import {
  MoneyAccountPlusBenefitsStatus,
  useMoneyAccountPlusBenefits,
} from './hooks/useMoneyAccountPlusBenefits';
import { useMoneyAccountSinceInceptionInterest } from '../../UI/Money/hooks/useMoneyAccountInterest';
import useMoneyPremiumAccountInterest from '../../UI/Money/hooks/useMoneyPremiumAccountInterest';
import useMoneyPremiumVaultRate from '../../UI/Money/hooks/useMoneyPremiumVaultRate';

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

// ─── Plus access ──────────────────────────────────────────────────────────────

const mockUseMoneyAccountPlusAccess = jest.fn();
jest.mock('../../../hooks/useMoneyAccountPlusAccess', () => ({
  ...jest.requireActual('../../../hooks/useMoneyAccountPlusAccess'),
  useMoneyAccountPlusAccess: () => mockUseMoneyAccountPlusAccess(),
}));

const mockUseMoneyAccountPlusBenefits = jest.mocked(
  useMoneyAccountPlusBenefits,
);
jest.mock('./hooks/useMoneyAccountPlusBenefits', () => ({
  ...jest.requireActual('./hooks/useMoneyAccountPlusBenefits'),
  useMoneyAccountPlusBenefits: jest.fn(),
}));

const mockUseMoneyPremiumAccountInterest = jest.mocked(
  useMoneyPremiumAccountInterest,
);
jest.mock('../../UI/Money/hooks/useMoneyPremiumAccountInterest', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseMoneyAccountSinceInceptionInterest = jest.mocked(
  useMoneyAccountSinceInceptionInterest,
);
jest.mock('../../UI/Money/hooks/useMoneyAccountInterest', () => ({
  __esModule: true,
  default: jest.fn(),
  useMoneyAccountSinceInceptionInterest: jest.fn(),
}));

const mockUseMoneyPremiumVaultRate = jest.mocked(useMoneyPremiumVaultRate);
jest.mock('../../UI/Money/hooks/useMoneyPremiumVaultRate', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseMembershipBannerModel = jest.mocked(useMembershipBannerModel);
jest.mock('./hooks/useMembershipBannerModel', () => ({
  useMembershipBannerModel: jest.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createPlusSubscription = (status: Subscription['status']): Subscription =>
  ({
    id: 'sub-plus',
    products: [{ name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS }],
    status,
  }) as Subscription;

const createState = ({
  isTrialing = false,
  subscriptions,
}: {
  isTrialing?: boolean;
  subscriptions?: Subscription[];
} = {}): RootState =>
  ({
    engine: {
      backgroundState: {
        SubscriptionController: {
          subscriptions: subscriptions ?? [
            createPlusSubscription(
              isTrialing
                ? SUBSCRIPTION_STATUSES.trialing
                : SUBSCRIPTION_STATUSES.active,
            ),
          ],
          trialedProducts: isTrialing ? [PRODUCT_TYPES.MONEY_ACCOUNT_PLUS] : [],
        },
      },
    },
  }) as unknown as RootState;

const renderProHub = ({
  isTrialing = false,
  subscriptions,
}: {
  isTrialing?: boolean;
  subscriptions?: Subscription[];
} = {}) =>
  render(
    <Provider
      store={configureStore(createState({ isTrialing, subscriptions }))}
    >
      <ProHub />
    </Provider>,
  );

/**
 * Escapes all regex special characters so a plain string can be used
 * as a partial-match pattern inside toHaveTextContent().
 */
const toRegex = (s: string) =>
  new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

const TRADE_ALLOWANCE_ID_LIST = Object.values(TRADE_ALLOWANCE_IDS);

const ACTIVE_MEMBERSHIP_BANNER = getMembershipBannerModel(
  createPlusSubscription(SUBSCRIPTION_STATUSES.active),
);

// Interest totals are covered by mocking useMoneyPremiumAccountInterest,
// useMoneyAccountSinceInceptionInterest, and useMoneyPremiumVaultRate.
// Access and benefits still depend on the subscriptions query, so this
// screen test mocks those hooks. The banner model and the
// displayed-subscription selector have their own unit tests.

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('ProHub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack = jest.fn();
    mockNavigate = jest.fn();
    mockUseMoneyAccountPlusAccess.mockReturnValue(
      MoneyAccountPlusAccess.Subscriber,
    );
    mockUseMoneyAccountPlusBenefits.mockReturnValue({
      status: MoneyAccountPlusBenefitsStatus.Ready,
      items: MOCK_TRADE_ALLOWANCES,
      resetsOn: 'Sep 15',
      retry: jest.fn(),
    });
    mockUseMoneyPremiumAccountInterest.mockReturnValue({
      sinceInceptionQuery: {
        data: { interest_earned_usd: '12.5' },
        isError: false,
      },
      sinceInceptionInterest: '+$12.50',
    } as ReturnType<typeof useMoneyPremiumAccountInterest>);
    mockUseMoneyAccountSinceInceptionInterest.mockReturnValue({
      data: undefined,
      isError: false,
    } as ReturnType<typeof useMoneyAccountSinceInceptionInterest>);
    mockUseMoneyPremiumVaultRate.mockReturnValue({
      vaultRateQuery: { data: undefined },
      rate: '0.041',
      ratePercent: 4.1,
      ratePercentFormatted: '4.1%',
    } as ReturnType<typeof useMoneyPremiumVaultRate>);
    mockUseMembershipBannerModel.mockReturnValue({
      model: ACTIVE_MEMBERSHIP_BANNER,
      subscription: undefined,
    });
  });

  // ── Access guard ───────────────────────────────────────────────────────────

  describe('Access guard', () => {
    it('navigates back when Pro is disabled', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Disabled,
      );

      renderProHub();

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('navigates back when there is no Plus membership', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Eligible,
      );

      renderProHub({ subscriptions: [] });

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('stays open while Plus access is unresolved', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Unknown,
      );

      const { queryByTestId } = renderProHub({ subscriptions: [] });

      expect(mockGoBack).not.toHaveBeenCalled();
      expect(queryByTestId(ProHubTestIds.MEMBERSHIP_BANNER)).toBeNull();
    });

    it.each([
      SUBSCRIPTION_STATUSES.pastDue,
      SUBSCRIPTION_STATUSES.awaitingFunds,
      SUBSCRIPTION_STATUSES.unpaid,
    ])('shows the hub for a %s plan while access is unresolved', (status) => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Unknown,
      );

      const { getByTestId } = renderProHub({
        subscriptions: [createPlusSubscription(status)],
      });

      expect(mockGoBack).not.toHaveBeenCalled();
      expect(getByTestId(ProHubTestIds.MEMBERSHIP_BANNER)).toBeOnTheScreen();
    });

    it('stays open for an entitled subscriber', () => {
      renderProHub();

      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('leaves when only a cached plan remains after access lapses', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Eligible,
      );
      mockUseMembershipBannerModel.mockReturnValue({
        model: {
          statusKind: MembershipStatusKind.Cancelled,
          statusKey: 'pro_hub.membership_status.cancelled',
        },
        subscription: { id: 'sub-last' } as Subscription,
      });

      const { queryByTestId } = renderProHub({
        subscriptions: [createPlusSubscription(SUBSCRIPTION_STATUSES.canceled)],
      });

      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(queryByTestId(ProHubTestIds.MEMBERSHIP_BANNER)).toBeNull();
    });

    it('stays open for a paused plan without an entitlement', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Eligible,
      );

      const { getByTestId } = renderProHub({
        subscriptions: [createPlusSubscription(SUBSCRIPTION_STATUSES.paused)],
      });

      expect(mockGoBack).not.toHaveBeenCalled();
      expect(getByTestId(ProHubTestIds.MEMBERSHIP_BANNER)).toBeOnTheScreen();
    });

    it.each([
      SUBSCRIPTION_STATUSES.incomplete,
      SUBSCRIPTION_STATUSES.incompleteExpired,
    ])('leaves when the Plus plan is %s', (status) => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Eligible,
      );

      const { queryByTestId } = renderProHub({
        subscriptions: [createPlusSubscription(status)],
      });

      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(queryByTestId(ProHubTestIds.MEMBERSHIP_BANNER)).toBeNull();
    });

    it('leaves when Pro is disabled even if a plan is still displayed', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Disabled,
      );
      mockUseMembershipBannerModel.mockReturnValue({
        model: {
          statusKind: MembershipStatusKind.Cancelled,
          statusKey: 'pro_hub.membership_status.cancelled',
        },
        subscription: { id: 'sub-last' } as Subscription,
      });

      const { queryByTestId } = renderProHub();

      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(queryByTestId(ProHubTestIds.MEMBERSHIP_BANNER)).toBeNull();
    });

    it('does not render subscriber content without a membership', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Eligible,
      );

      const { queryByTestId } = renderProHub({ subscriptions: [] });

      expect(queryByTestId(ProHubTestIds.MEMBERSHIP_BANNER)).toBeNull();
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
      const { getByTestId, queryByTestId } = renderProHub();

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
      expect(
        within(lifetimeEarningsSection).getAllByText('+$12.50'),
      ).toHaveLength(2);
      expect(lifetimeEarningsSection).not.toHaveTextContent(toRegex('$86.42'));
      expect(moneyBalanceRow).toHaveTextContent(
        toRegex(
          strings('pro_hub.money_balance', {
            apy: '4.1%',
          }),
        ),
      );
      expect(moneyBalanceRow).toHaveTextContent(toRegex('+$12.50'));
      expect(musdBackRow).toHaveTextContent(
        toRegex(
          strings('pro_hub.musd_back', {
            rate: `${MOCK_PRO_HUB_STATS.musdBackRate}%`,
          }),
        ),
      );
      expect(musdBackRow).toHaveTextContent(
        toRegex(MOCK_PRO_HUB_STATS.musdBack),
      );
      expect(queryByTestId(`${ProHubTestIds.MUSD_BACK_ROW}-lock`)).toBeNull();
    });

    it('shows a lock instead of the mUSD back amount during a free trial', () => {
      const { getByTestId, queryByText } = renderProHub({ isTrialing: true });

      const musdBackRow = getByTestId(ProHubTestIds.MUSD_BACK_ROW);
      const lock = getByTestId(`${ProHubTestIds.MUSD_BACK_ROW}-lock`);

      expect(lock).toBeOnTheScreen();
      expect(musdBackRow).toContainElement(lock);
      expect(queryByText(MOCK_PRO_HUB_STATS.musdBack)).toBeNull();
    });

    it('shows placeholders while premium interest and vault rate are unavailable', () => {
      mockUseMoneyPremiumAccountInterest.mockReturnValue({
        sinceInceptionQuery: { data: undefined },
        sinceInceptionInterest: '$0.00',
      } as ReturnType<typeof useMoneyPremiumAccountInterest>);
      mockUseMoneyPremiumVaultRate.mockReturnValue({
        vaultRateQuery: { data: undefined },
        rate: undefined,
        ratePercent: undefined,
        ratePercentFormatted: undefined,
      } as ReturnType<typeof useMoneyPremiumVaultRate>);

      const { getByTestId } = renderProHub();
      const lifetimeEarningsSection = getByTestId(
        ProHubTestIds.LIFETIME_EARNINGS_SECTION,
      );
      const moneyBalanceRow = getByTestId(ProHubTestIds.MONEY_BALANCE_ROW);

      expect(moneyBalanceRow).toHaveTextContent(
        toRegex(strings('pro_hub.money_balance', { apy: '—' })),
      );
      expect(moneyBalanceRow).toHaveTextContent(toRegex('$0.00'));
      // Headline, Money balance row, and the still-mocked mUSD back amount.
      expect(
        within(lifetimeEarningsSection).getAllByText('$0.00'),
      ).toHaveLength(3);
    });

    it('shows premium plus base interest on the headline and the money balance row', () => {
      mockUseMoneyAccountSinceInceptionInterest.mockReturnValue({
        data: { interest_earned_usd: '2.5' },
        isError: false,
      } as ReturnType<typeof useMoneyAccountSinceInceptionInterest>);

      const { getByTestId } = renderProHub();
      const lifetimeEarningsSection = getByTestId(
        ProHubTestIds.LIFETIME_EARNINGS_SECTION,
      );
      const moneyBalanceRow = getByTestId(ProHubTestIds.MONEY_BALANCE_ROW);

      expect(
        within(lifetimeEarningsSection).getAllByText('+$15.00'),
      ).toHaveLength(2);
      expect(moneyBalanceRow).toHaveTextContent(toRegex('+$15.00'));
      expect(moneyBalanceRow).not.toHaveTextContent(toRegex('+$12.50'));
    });

    it('shows an em dash for interest when base-vault interest failed', () => {
      mockUseMoneyAccountSinceInceptionInterest.mockReturnValue({
        data: undefined,
        isError: true,
      } as ReturnType<typeof useMoneyAccountSinceInceptionInterest>);

      const { getByTestId } = renderProHub();
      const lifetimeEarningsSection = getByTestId(
        ProHubTestIds.LIFETIME_EARNINGS_SECTION,
      );
      const moneyBalanceRow = getByTestId(ProHubTestIds.MONEY_BALANCE_ROW);

      expect(within(lifetimeEarningsSection).getAllByText('—')).toHaveLength(2);
      expect(moneyBalanceRow).toHaveTextContent(toRegex('—'));
      expect(moneyBalanceRow).not.toHaveTextContent(toRegex('+$12.50'));
    });

    it('renders an active plan without a membership alert', () => {
      const { queryByTestId } = renderProHub();

      expect(
        queryByTestId(
          ProHubTestIds.MEMBERSHIP_ALERT_BANNER(MembershipStatusKind.Overdue),
        ),
      ).toBeNull();
      expect(
        queryByTestId(
          ProHubTestIds.MEMBERSHIP_ALERT_BANNER(
            MembershipStatusKind.Deactivated,
          ),
        ),
      ).toBeNull();
    });

    it('opens add money when the overdue alert action is pressed', () => {
      mockUseMembershipBannerModel.mockReturnValue({
        model: {
          statusKind: MembershipStatusKind.Overdue,
          statusKey: 'pro_hub.membership_status.overdue',
          iconColor: IconColor.ErrorDefault,
          alert: {
            severity: 'danger' as const,
            titleKey: 'pro_hub.membership_alert.payment_failed.title',
            descriptionKey:
              'pro_hub.membership_alert.payment_failed.description',
            actionKey: 'pro_hub.membership_alert.payment_failed.action',
            action: 'addFunds' as const,
          },
        },
        subscription: undefined,
      });

      const { getByTestId } = renderProHub();

      fireEvent.press(
        getByTestId(
          ProHubTestIds.MEMBERSHIP_ALERT_ACTION(MembershipStatusKind.Overdue),
        ),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
      });
    });

    it('opens the subscription flow when the renew action is pressed', () => {
      mockUseMembershipBannerModel.mockReturnValue({
        model: {
          statusKind: MembershipStatusKind.Cancelled,
          statusKey: 'pro_hub.membership_status.cancelled',
          alert: {
            severity: 'warning' as const,
            titleKey: 'pro_hub.membership_alert.cancelled.title',
            descriptionKey: 'pro_hub.membership_alert.cancelled.description',
            actionKey: 'pro_hub.membership_alert.cancelled.action',
            action: 'renew' as const,
          },
        },
        subscription: { id: 'sub-last' } as Subscription,
      });

      const { getByTestId } = renderProHub();

      fireEvent.press(
        getByTestId(
          ProHubTestIds.MEMBERSHIP_ALERT_ACTION(MembershipStatusKind.Cancelled),
        ),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PRO_SUBSCRIPTION.ROOT);
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
      expect(banner).toHaveProp(
        'accessibilityLabel',
        `${strings('pro_hub.physical_card.title')}. ${strings('pro_hub.physical_card.description')}`,
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

    it('shows unlock copy and does not navigate when the banner is pressed during a free trial', () => {
      const { getByTestId } = renderProHub({ isTrialing: true });

      const banner = getByTestId(ProHubTestIds.PHYSICAL_CARD_BANNER);

      expect(getByTestId(ProHubTestIds.PHYSICAL_CARD_TITLE)).toHaveTextContent(
        strings('pro_hub.physical_card.trial_title', {
          rate: `${MOCK_PRO_HUB_STATS.musdBackRate}%`,
        }),
      );
      expect(
        getByTestId(ProHubTestIds.PHYSICAL_CARD_DESCRIPTION),
      ).toHaveTextContent(strings('pro_hub.physical_card.trial_description'));
      expect(banner).toHaveProp(
        'accessibilityLabel',
        `${strings('pro_hub.physical_card.trial_title', {
          rate: `${MOCK_PRO_HUB_STATS.musdBackRate}%`,
        })}. ${strings('pro_hub.physical_card.trial_description')}`,
      );
      expect(banner).not.toHaveProp('onPress');

      fireEvent.press(banner);

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not navigate on initial render', () => {
      renderProHub();

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
