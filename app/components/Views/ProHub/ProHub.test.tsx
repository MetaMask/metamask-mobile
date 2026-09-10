import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProHub from './ProHub';
import { ProHubTestIds } from './ProHub.testIds';
import { ALSO_INCLUDED_ITEMS, MOCK_TRADE_ALLOWANCES } from './ProHub.constants';
import { MemberPricingOnTradesTestIds } from './components/MemberPricingOnTrades';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { MoneyAccountPlusAccess } from '../../../hooks/useMoneyAccountPlusAccess';
import {
  MoneyAccountPlusBenefitsStatus,
  useMoneyAccountPlusBenefits,
} from '../../../hooks/useMoneyAccountPlusBenefits';
import { usePlusBenefitDetail } from '../../../hooks/usePlusBenefitDetail';
import { PlusBenefitDetailSheetTestIds } from './components/PlusBenefitDetailSheet';
import { PlusBenefitDetailStatus } from './components/MemberPricingOnTrades/mapPlusBenefitToDetail';

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
jest.mock('../../../hooks/useMoneyAccountPlusBenefits', () => ({
  ...jest.requireActual('../../../hooks/useMoneyAccountPlusBenefits'),
  useMoneyAccountPlusBenefits: jest.fn(),
}));

const mockUsePlusBenefitDetail = jest.mocked(usePlusBenefitDetail);
jest.mock('../../../hooks/usePlusBenefitDetail', () => ({
  usePlusBenefitDetail: jest.fn(),
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
    mockUseMoneyAccountPlusAccess.mockReturnValue(
      MoneyAccountPlusAccess.Subscriber,
    );
    mockUseMoneyAccountPlusBenefits.mockReturnValue({
      status: MoneyAccountPlusBenefitsStatus.Ready,
      items: MOCK_TRADE_ALLOWANCES,
      benefits: undefined,
      resetsOn: 'Sep 15',
      isRefreshing: false,
      hasError: false,
      retry: jest.fn(),
    });
    mockUsePlusBenefitDetail.mockReturnValue({
      id: 'swaps',
      titleKey: 'pro_hub.member_pricing.swaps.label',
      status: PlusBenefitDetailStatus.Available,
      kind: 'currency',
      used: 310,
      remaining: 190,
      allowance: 500,
      resetsOn: 'Sep 15',
      ctaRoute: Routes.BRIDGE.ROOT,
      ctaLabelKey: 'pro_hub.benefit_detail.cta.swaps',
      showRetry: false,
    });
  });

  // ── Access guard ───────────────────────────────────────────────────────────

  describe('Access guard', () => {
    it.each([
      ['disabled', MoneyAccountPlusAccess.Disabled],
      ['eligible but not entitled', MoneyAccountPlusAccess.Eligible],
    ])('navigates back when Pro access is %s', (_label, access) => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(access);

      renderProHub();

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('stays open for an entitled subscriber', () => {
      renderProHub();

      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('shows a skeleton instead of subscriber content while entitlements load', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Loading,
      );

      const { getByTestId, queryByTestId } = renderProHub();

      expect(getByTestId(ProHubTestIds.LOADING_SKELETON)).toBeOnTheScreen();
      expect(
        queryByTestId(ProHubTestIds.MEMBERSHIP_BANNER),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(ProHubTestIds.LIFETIME_EARNINGS_SECTION),
      ).not.toBeOnTheScreen();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('does not render the skeleton once entitlements resolve', () => {
      const { getByTestId, queryByTestId } = renderProHub();

      expect(
        queryByTestId(ProHubTestIds.LOADING_SKELETON),
      ).not.toBeOnTheScreen();
      expect(getByTestId(ProHubTestIds.MEMBERSHIP_BANNER)).toBeOnTheScreen();
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
        toRegex(strings('pro_hub.membership_brand')),
      );
      expect(membershipBanner).toHaveTextContent(
        toRegex(strings('pro_hub.membership_label')),
      );
      expect(lifetimeEarningsSection).toHaveTextContent(
        toRegex(strings('pro_hub.lifetime_earnings')),
      );
      expect(moneyBalanceRow).toHaveTextContent(
        toRegex(strings('pro_hub.money_balance')),
      );
      expect(musdBackRow).toHaveTextContent(
        toRegex(strings('pro_hub.musd_back')),
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

      TRADE_ALLOWANCE_IDS.forEach((id) => {
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

    it('opens the benefit detail sheet when a trade allowance row is pressed', () => {
      const { getByTestId } = renderProHub();

      fireEvent.press(getByTestId(MemberPricingOnTradesTestIds.ROW('swaps')));

      expect(
        getByTestId(PlusBenefitDetailSheetTestIds.SHEET),
      ).toBeOnTheScreen();
    });

    it('navigates to Swap from the benefit detail CTA', () => {
      const { getByTestId } = renderProHub();

      fireEvent.press(getByTestId(MemberPricingOnTradesTestIds.ROW('swaps')));
      fireEvent.press(getByTestId(PlusBenefitDetailSheetTestIds.CTA));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.ROOT);
    });

    it('does not navigate on initial render', () => {
      renderProHub();

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
