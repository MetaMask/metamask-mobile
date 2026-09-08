import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsTradingCampaignPrizePool, {
  PERPS_PRIZE_POOL_TEST_IDS,
} from './PerpsTradingCampaignPrizePool';
import type { PerpsTradingCampaignPrizePoolDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      onConfirm,
      confirmButtonLabel,
      testID,
    }: {
      title: string;
      description: string;
      onConfirm?: () => void;
      confirmButtonLabel?: string;
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(Text, null, title),
        confirmButtonLabel &&
          ReactActual.createElement(
            Pressable,
            { onPress: onConfirm, testID: `${testID}-retry` },
            ReactActual.createElement(Text, null, confirmButtonLabel),
          ),
      ),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    const t: Record<string, string> = {
      'rewards.campaign_prize_pool.error_title': 'Prize pool unavailable',
      'rewards.campaign_prize_pool.error_description':
        'Could not load prize pool.',
      'rewards.campaign_prize_pool.retry': 'Retry',
      'rewards.campaign_prize_pool.current_label': 'Current',
      'rewards.campaign_prize_pool.next_label': 'Next',
      'rewards.campaign_prize_pool.volume_subtext':
        '{{current}} of {{target}} volume',
      'rewards.campaign_prize_pool.max_tier_subtext':
        '{{maxThreshold}}+ TVL — all milestones reached',
      'rewards.campaign_prize_pool.max_badge': 'Max',
    };
    let result = t[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        result = result.replace(`{{${k}}}`, v);
      });
    }
    return result;
  },
  default: { locale: 'en-US' },
}));

jest.mock('../../utils/formatUtils', () => ({
  formatUsd: (value: string | number) =>
    `$${Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
  formatCompactUsd: (value: number) => {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value}`;
  },
}));

const mockRefetch = jest.fn();

const buildPrizePool = (
  overrides: Partial<PerpsTradingCampaignPrizePoolDto> = {},
): PerpsTradingCampaignPrizePoolDto => ({
  totalVolumeUsd: 7_500_000,
  unlockedPoolUsd: 2_000,
  thresholdsUsd: [0, 1_000_000, 2_000_000],
  poolScheduleUsd: [1_000, 2_000, 3_000],
  computedAt: '2026-07-15T00:00:00.000Z',
  ...overrides,
});

// The ladder the backend serves for the live perps campaign: $10k base, scaling
// by $5k per $5M notional volume up to $50k at $40M. Used as the default so the
// tier, progress and max-badge cases below read against a realistic schedule.
const volumeScaledPrizePool = buildPrizePool({
  unlockedPoolUsd: 15_000,
  thresholdsUsd: [
    0, 5_000_000, 10_000_000, 15_000_000, 20_000_000, 25_000_000, 30_000_000,
    35_000_000, 40_000_000,
  ],
  poolScheduleUsd: [
    10_000, 15_000, 20_000, 25_000, 30_000, 35_000, 40_000, 45_000, 50_000,
  ],
});

const baseProps = {
  prizePool: volumeScaledPrizePool as PerpsTradingCampaignPrizePoolDto | null,
  isLoading: false,
  hasError: false,
  refetch: mockRefetch,
};

describe('PerpsTradingCampaignPrizePool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders container, progress bar, and subtext when data is provided', () => {
    const { getByTestId } = render(
      <PerpsTradingCampaignPrizePool {...baseProps} />,
    );

    expect(getByTestId(PERPS_PRIZE_POOL_TEST_IDS.CONTAINER)).toBeDefined();
    expect(getByTestId(PERPS_PRIZE_POOL_TEST_IDS.PROGRESS_BAR)).toBeDefined();
    expect(getByTestId(PERPS_PRIZE_POOL_TEST_IDS.SUBTEXT)).toBeDefined();
  });

  it('shows current and next prize between $5M and $10M notional', () => {
    const { getByText } = render(
      <PerpsTradingCampaignPrizePool {...baseProps} />,
    );

    expect(getByText('$15,000.00')).toBeDefined();
    expect(getByText('$20,000.00')).toBeDefined();
  });

  it('computes 50% progress halfway between $5M and $10M volume', () => {
    const { getByTestId } = render(
      <PerpsTradingCampaignPrizePool {...baseProps} />,
    );

    const progressBar = getByTestId(PERPS_PRIZE_POOL_TEST_IDS.PROGRESS_BAR);
    const innerBar = progressBar.props.children;
    expect(innerBar.props.style).toEqual({ width: '50%' });
  });

  it('shows max badge and full progress at $40M notional (top tier)', () => {
    const { getByTestId, getByText, queryByText } = render(
      <PerpsTradingCampaignPrizePool
        {...baseProps}
        prizePool={{ ...volumeScaledPrizePool, totalVolumeUsd: 40_000_000 }}
      />,
    );

    expect(getByTestId(PERPS_PRIZE_POOL_TEST_IDS.MAX_BADGE)).toBeDefined();
    expect(getByText('Max')).toBeDefined();
    expect(getByText('$50,000.00')).toBeDefined();
    expect(queryByText('Next')).toBeNull();

    const progressBar = getByTestId(PERPS_PRIZE_POOL_TEST_IDS.PROGRESS_BAR);
    const innerBar = progressBar.props.children;
    expect(innerBar.props.style).toEqual({ width: '100%' });

    const subtext = getByTestId(PERPS_PRIZE_POOL_TEST_IDS.SUBTEXT);
    expect(subtext.props.children).toBe('$40M+ TVL — all milestones reached');
  });

  it('does not show max badge below top tier', () => {
    const { queryByTestId } = render(
      <PerpsTradingCampaignPrizePool
        {...baseProps}
        prizePool={{ ...volumeScaledPrizePool, totalVolumeUsd: 10_000_000 }}
      />,
    );

    expect(queryByTestId(PERPS_PRIZE_POOL_TEST_IDS.MAX_BADGE)).toBeNull();
  });

  it('with zero volume and not loading, shows first-tier defaults ($10k → $15k)', () => {
    const { getByText, getByTestId } = render(
      <PerpsTradingCampaignPrizePool
        {...baseProps}
        prizePool={{ ...volumeScaledPrizePool, totalVolumeUsd: 0 }}
      />,
    );

    expect(getByText('$10,000.00')).toBeDefined();
    expect(getByText('$15,000.00')).toBeDefined();
    const progressBar = getByTestId(PERPS_PRIZE_POOL_TEST_IDS.PROGRESS_BAR);
    const innerBar = progressBar.props.children;
    expect(innerBar.props.style).toEqual({ width: '0%' });
  });

  it('shows skeleton when loading with no prize-pool data', () => {
    const { getByTestId, queryByTestId } = render(
      <PerpsTradingCampaignPrizePool
        {...baseProps}
        prizePool={null}
        isLoading
      />,
    );

    expect(getByTestId(PERPS_PRIZE_POOL_TEST_IDS.CONTAINER)).toBeDefined();
    expect(queryByTestId(PERPS_PRIZE_POOL_TEST_IDS.PROGRESS_BAR)).toBeNull();
    expect(queryByTestId(PERPS_PRIZE_POOL_TEST_IDS.SUBTEXT)).toBeNull();
  });

  it('shows stale content when loading but prize-pool data already exists', () => {
    const { getByTestId } = render(
      <PerpsTradingCampaignPrizePool {...baseProps} isLoading />,
    );

    expect(getByTestId(PERPS_PRIZE_POOL_TEST_IDS.PROGRESS_BAR)).toBeDefined();
    expect(getByTestId(PERPS_PRIZE_POOL_TEST_IDS.SUBTEXT)).toBeDefined();
  });

  it('shows error banner when hasError and no prize-pool data', () => {
    const { getByTestId, queryByTestId } = render(
      <PerpsTradingCampaignPrizePool
        {...baseProps}
        prizePool={null}
        hasError
      />,
    );

    expect(getByTestId(PERPS_PRIZE_POOL_TEST_IDS.ERROR_BANNER)).toBeDefined();
    expect(queryByTestId(PERPS_PRIZE_POOL_TEST_IDS.PROGRESS_BAR)).toBeNull();
  });

  it('hides error banner when hasError but stale prize-pool data exists', () => {
    const { queryByTestId, getByTestId } = render(
      <PerpsTradingCampaignPrizePool {...baseProps} hasError />,
    );

    expect(queryByTestId(PERPS_PRIZE_POOL_TEST_IDS.ERROR_BANNER)).toBeNull();
    expect(getByTestId(PERPS_PRIZE_POOL_TEST_IDS.PROGRESS_BAR)).toBeDefined();
  });

  it('calls refetch when error retry is pressed', () => {
    const { getByTestId } = render(
      <PerpsTradingCampaignPrizePool
        {...baseProps}
        prizePool={null}
        hasError
      />,
    );

    fireEvent.press(
      getByTestId(`${PERPS_PRIZE_POOL_TEST_IDS.ERROR_BANNER}-retry`),
    );
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('renders volume subtext with compact amounts', () => {
    const { getByTestId } = render(
      <PerpsTradingCampaignPrizePool {...baseProps} />,
    );

    const subtext = getByTestId(PERPS_PRIZE_POOL_TEST_IDS.SUBTEXT);
    expect(subtext.props.children).toBe('$7.5M of $10M volume');
  });

  describe('backend-driven prize ladder', () => {
    it('renders the ladder the API provides', () => {
      const { getByText, queryByText } = render(
        <PerpsTradingCampaignPrizePool
          {...baseProps}
          prizePool={buildPrizePool({ totalVolumeUsd: 1_500_000 })}
        />,
      );

      expect(getByText('$2,000.00')).toBeOnTheScreen();
      expect(getByText('$3,000.00')).toBeOnTheScreen();
      expect(queryByText('$15,000.00')).not.toBeOnTheScreen();
    });

    it('renders a single unlocked-pool tier when the API returns no thresholds', () => {
      const { getByText, getByTestId } = render(
        <PerpsTradingCampaignPrizePool
          {...baseProps}
          prizePool={buildPrizePool({
            thresholdsUsd: [],
            poolScheduleUsd: [],
            unlockedPoolUsd: 2_000,
          })}
        />,
      );

      expect(getByText('$2,000.00')).toBeOnTheScreen();
      expect(getByTestId(PERPS_PRIZE_POOL_TEST_IDS.MAX_BADGE)).toBeDefined();
    });

    it('renders an empty ladder when no prize pool is available', () => {
      const { getByText, getByTestId } = render(
        <PerpsTradingCampaignPrizePool {...baseProps} prizePool={null} />,
      );

      expect(getByText('$0.00')).toBeOnTheScreen();
      expect(getByTestId(PERPS_PRIZE_POOL_TEST_IDS.MAX_BADGE)).toBeDefined();
    });

    it('prepends a zero-volume milestone when the API ladder omits one', () => {
      const { getAllByText } = render(
        <PerpsTradingCampaignPrizePool
          {...baseProps}
          prizePool={buildPrizePool({
            totalVolumeUsd: 0,
            thresholdsUsd: [1_000_000, 2_000_000],
            poolScheduleUsd: [1_000, 2_000],
          })}
        />,
      );

      // The prepended $0-volume tier carries the first schedule amount, so it
      // shows as both the current and the next prize at zero volume.
      expect(getAllByText('$1,000.00')).toHaveLength(2);
    });

    it('uses the unlocked pool when a threshold has no matching schedule entry', () => {
      const { getByText } = render(
        <PerpsTradingCampaignPrizePool
          {...baseProps}
          prizePool={buildPrizePool({
            totalVolumeUsd: 0,
            thresholdsUsd: [0, 1_000_000],
            poolScheduleUsd: [1_000],
            unlockedPoolUsd: 9_000,
          })}
        />,
      );

      expect(getByText('$1,000.00')).toBeOnTheScreen();
      expect(getByText('$9,000.00')).toBeOnTheScreen();
    });
  });
});
