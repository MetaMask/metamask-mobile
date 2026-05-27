import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import ReferralInfoSection, {
  REFERRAL_INFO_SECTION_TEST_IDS,
} from './ReferralInfoSection';
import { selectIsCurrentSubscriptionVipEnabled } from '../../../../../selectors/rewards';
import { useVipDashboard } from '../../hooks/useVipDashboard';
import type { VipDashboardState } from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../hooks/useVipDashboard', () => ({
  useVipDashboard: jest.fn(),
}));

jest.mock('../../../../../selectors/rewards', () => ({
  selectIsCurrentSubscriptionVipEnabled: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.referral.info.title': 'Share your code with friends',
      'rewards.referral.info.description':
        'Referral bonuses vary by campaign. Check each one for details.',
      'rewards.referral.info.vip_title':
        'Earn revenue share on every swap and perp your referrals make. Your rate scales with your tier.',
      'rewards.referral.info.vip_referrals_label': 'Referrals',
      'rewards.referral.info.vip_revenue_share_label': 'Revenue share',
      'rewards.vip.error_title': "We couldn't load your VIP dashboard",
      'rewards.vip.error_description': 'Check your connection and try again.',
      'rewards.vip.retry_button': 'Retry',
    };
    return translations[key] || key;
  }),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseVipDashboard = useVipDashboard as jest.MockedFunction<
  typeof useVipDashboard
>;

const buildDashboard = (
  overrides: Partial<VipDashboardState> = {},
): VipDashboardState =>
  ({
    program: { id: 'vip', name: 'VIP Pilot' },
    period: {
      start: '2026-03-31T00:00:00.000Z',
      end: '2026-04-30T23:59:59.999Z',
    },
    currentTier: { id: 't3', name: 'Gold Fox 3', tier: 3 },
    nextTier: { id: 't4', name: 'Gold Fox 4', tier: 4 },
    progress: {
      percent: 72,
      remainingPointsToNextTier: 360000,
      status: 'on_track',
    },
    fees: {
      revenueShareBps: 1500,
      swapsBps: 15,
      perpsBps: 4,
      nextTierRevenueShareBps: 2000,
      nextTierSwapsBps: 12,
      nextTierPerpsBps: 3,
    },
    volume: {
      swapsUsd: 4100000,
      perpsUsd: 2300000,
      points: 530000,
      pointsFromReferrals: 100000,
      referrals: 12,
      referralsCap: 50,
    },
    pointsAllocation: {
      earned: 24400000,
      threshold: 100000000,
      percent: 24.4,
    },
    tiers: [
      {
        id: 't3',
        name: 'Gold Fox 3',
        tier: 3,
        pointsRequirement: 150000,
        swapsBps: 15,
        perpsBps: 4,
        revenueShareBps: 1500,
        referralCarryoverBps: 1500,
        status: 'current',
      },
    ],
    localizedText: {} as VipDashboardState['localizedText'],
    lastFetched: 123,
    ...overrides,
  }) as VipDashboardState;

const mockFetch = jest.fn();

const setSelectors = ({ isVipEnabled }: { isVipEnabled: boolean }) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectIsCurrentSubscriptionVipEnabled) {
      return isVipEnabled;
    }
    return undefined;
  });
};

const setHookState = (
  overrides: Partial<ReturnType<typeof useVipDashboard>> = {},
) => {
  mockUseVipDashboard.mockReturnValue({
    dashboard: null,
    isLoading: false,
    hasError: false,
    hasAttemptedFetch: true,
    fetchVipDashboard: mockFetch,
    ...overrides,
  });
};

describe('ReferralInfoSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('non-VIP subscription', () => {
    beforeEach(() => {
      setSelectors({ isVipEnabled: false });
      setHookState();
    });

    it('renders the generic title and description', () => {
      const { getByText, getByTestId, queryByTestId } = render(
        <ReferralInfoSection />,
      );

      expect(getByTestId(REFERRAL_INFO_SECTION_TEST_IDS.GENERIC)).toBeTruthy();
      expect(getByText('Share your code with friends')).toBeTruthy();
      expect(
        getByText(
          'Referral bonuses vary by campaign. Check each one for details.',
        ),
      ).toBeTruthy();
      expect(queryByTestId(REFERRAL_INFO_SECTION_TEST_IDS.VIP)).toBeNull();
    });
  });

  describe('VIP subscription', () => {
    beforeEach(() => {
      setSelectors({ isVipEnabled: true });
    });

    it('shows a skeleton while the dashboard has not been fetched yet', () => {
      setHookState({ hasAttemptedFetch: false });

      const { getByTestId, queryByTestId } = render(<ReferralInfoSection />);

      expect(
        getByTestId(REFERRAL_INFO_SECTION_TEST_IDS.VIP_SKELETON),
      ).toBeTruthy();
      expect(queryByTestId(REFERRAL_INFO_SECTION_TEST_IDS.VIP)).toBeNull();
      expect(
        queryByTestId(REFERRAL_INFO_SECTION_TEST_IDS.VIP_ERROR),
      ).toBeNull();
    });

    it('shows a skeleton while loading and no data is yet available', () => {
      setHookState({ isLoading: true, hasAttemptedFetch: true });

      const { getByTestId } = render(<ReferralInfoSection />);

      expect(
        getByTestId(REFERRAL_INFO_SECTION_TEST_IDS.VIP_SKELETON),
      ).toBeTruthy();
    });

    it('renders the error banner when the fetch failed and no data is cached', () => {
      setHookState({ hasError: true, hasAttemptedFetch: true });

      const { getByTestId, getByText } = render(<ReferralInfoSection />);

      expect(
        getByTestId(REFERRAL_INFO_SECTION_TEST_IDS.VIP_ERROR),
      ).toBeTruthy();
      expect(getByText("We couldn't load your VIP dashboard")).toBeTruthy();
      expect(getByText('Check your connection and try again.')).toBeTruthy();
    });

    it('retries the dashboard fetch when the error banner CTA is tapped', () => {
      setHookState({ hasError: true, hasAttemptedFetch: true });

      const { getByText } = render(<ReferralInfoSection />);

      fireEvent.press(getByText('Retry'));
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('renders the VIP variant with referrals and carryover percent when data is available', () => {
      setHookState({ dashboard: buildDashboard(), hasAttemptedFetch: true });

      const { getByTestId, getByText, queryByTestId } = render(
        <ReferralInfoSection />,
      );

      expect(getByTestId(REFERRAL_INFO_SECTION_TEST_IDS.VIP)).toBeTruthy();
      expect(
        getByText(
          'Earn revenue share on every swap and perp your referrals make. Your rate scales with your tier.',
        ),
      ).toBeTruthy();
      expect(
        getByTestId(REFERRAL_INFO_SECTION_TEST_IDS.VIP_REFERRALS_VALUE),
      ).toHaveTextContent('12/50');
      expect(
        getByTestId(REFERRAL_INFO_SECTION_TEST_IDS.VIP_REVENUE_SHARE_VALUE),
      ).toHaveTextContent('15%');
      expect(queryByTestId(REFERRAL_INFO_SECTION_TEST_IDS.GENERIC)).toBeNull();
    });

    it('falls back to the generic info when the dashboard is empty and no error', () => {
      setHookState({ dashboard: null, hasAttemptedFetch: true });

      const { getByTestId } = render(<ReferralInfoSection />);

      expect(getByTestId(REFERRAL_INFO_SECTION_TEST_IDS.GENERIC)).toBeTruthy();
    });

    it('falls back to 0% when no tier is marked as current', () => {
      const dashboard = buildDashboard({
        tiers: [
          {
            id: 't3',
            name: 'Gold Fox 3',
            tier: 3,
            pointsRequirement: 150000,
            swapsBps: 15,
            perpsBps: 4,
            revenueShareBps: 1500,
            referralCarryoverBps: 1500,
            status: 'upcoming',
          },
        ],
      });
      setHookState({ dashboard, hasAttemptedFetch: true });

      const { getByTestId } = render(<ReferralInfoSection />);

      expect(
        getByTestId(REFERRAL_INFO_SECTION_TEST_IDS.VIP_REVENUE_SHARE_VALUE),
      ).toHaveTextContent('0%');
    });
  });
});
