import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import CampaignPrizePool, {
  CAMPAIGN_PRIZE_POOL_TEST_IDS,
  type CampaignPrizePoolSchedule,
} from './CampaignPrizePool';

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

const prizePool: CampaignPrizePoolSchedule = {
  totalVolumeUsd: 150,
  unlockedPoolUsd: 20_000,
  thresholdsUsd: [0, 100, 200],
  poolScheduleUsd: [10_000, 20_000, 30_000],
};

const baseProps = {
  prizePool: prizePool as CampaignPrizePoolSchedule | null,
  isLoading: false,
  hasError: false,
  refetch: mockRefetch,
};

describe('CampaignPrizePool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders container, progress bar, and subtext when data is provided', () => {
    const { getByTestId } = render(<CampaignPrizePool {...baseProps} />);

    expect(getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.CONTAINER)).toBeDefined();
    expect(
      getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.PROGRESS_BAR),
    ).toBeDefined();
    expect(getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.SUBTEXT)).toBeDefined();
  });

  it('shows current and next prize between milestones', () => {
    const { getByText } = render(<CampaignPrizePool {...baseProps} />);

    expect(getByText('$20,000.00')).toBeDefined();
    expect(getByText('$30,000.00')).toBeDefined();
  });

  it('computes 50% progress halfway between thresholds', () => {
    const { getByTestId } = render(<CampaignPrizePool {...baseProps} />);

    const progressBar = getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.PROGRESS_BAR);
    const innerBar = progressBar.props.children;
    expect(innerBar.props.style).toEqual({ width: '50%' });
  });

  it('shows max badge and full progress at top tier', () => {
    const { getByTestId, getByText, queryByText } = render(
      <CampaignPrizePool
        {...baseProps}
        prizePool={{ ...prizePool, totalVolumeUsd: 250 }}
      />,
    );

    expect(getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.MAX_BADGE)).toBeDefined();
    expect(getByText('Max')).toBeDefined();
    expect(getByText('$30,000.00')).toBeDefined();
    expect(queryByText('Next')).toBeNull();

    const progressBar = getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.PROGRESS_BAR);
    const innerBar = progressBar.props.children;
    expect(innerBar.props.style).toEqual({ width: '100%' });
  });

  it('shows skeleton when loading with no prize-pool data', () => {
    const { getByTestId, queryByTestId } = render(
      <CampaignPrizePool {...baseProps} prizePool={null} isLoading />,
    );

    expect(getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.CONTAINER)).toBeDefined();
    expect(queryByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.PROGRESS_BAR)).toBeNull();
  });

  it('shows stale content when loading but prize-pool data already exists', () => {
    const { getByTestId } = render(
      <CampaignPrizePool {...baseProps} isLoading />,
    );

    expect(
      getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.PROGRESS_BAR),
    ).toBeDefined();
  });

  it('shows error banner when hasError and no prize-pool data', () => {
    const { getByTestId, queryByTestId } = render(
      <CampaignPrizePool {...baseProps} prizePool={null} hasError />,
    );

    expect(
      getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.ERROR_BANNER),
    ).toBeDefined();
    expect(queryByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.PROGRESS_BAR)).toBeNull();
  });

  it('keeps stale content when hasError but prize-pool data already exists', () => {
    const { queryByTestId, getByTestId } = render(
      <CampaignPrizePool {...baseProps} hasError />,
    );

    expect(queryByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.ERROR_BANNER)).toBeNull();
    expect(
      getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.PROGRESS_BAR),
    ).toBeDefined();
  });

  it('calls refetch when error retry is pressed', () => {
    const { getByTestId } = render(
      <CampaignPrizePool {...baseProps} prizePool={null} hasError />,
    );

    fireEvent.press(
      getByTestId(`${CAMPAIGN_PRIZE_POOL_TEST_IDS.ERROR_BANNER}-retry`),
    );
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('sorts unsorted thresholds before computing progress', () => {
    const { getByTestId } = render(
      <CampaignPrizePool
        {...baseProps}
        prizePool={{
          ...prizePool,
          thresholdsUsd: [200, 0, 100],
          poolScheduleUsd: [30_000, 10_000, 20_000],
        }}
      />,
    );

    const progressBar = getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.PROGRESS_BAR);
    const innerBar = progressBar.props.children;
    expect(innerBar.props.style).toEqual({ width: '50%' });
  });

  it('prepends a zero-threshold milestone when the ladder starts above zero', () => {
    const { getAllByText } = render(
      <CampaignPrizePool
        {...baseProps}
        prizePool={{
          ...prizePool,
          totalVolumeUsd: 0,
          thresholdsUsd: [100, 200],
          poolScheduleUsd: [10_000, 20_000],
        }}
      />,
    );

    expect(getAllByText('$10,000.00')).toHaveLength(2);
  });

  it('does not duplicate an existing zero-threshold milestone', () => {
    const { getByText, queryAllByText } = render(
      <CampaignPrizePool
        {...baseProps}
        prizePool={{
          ...prizePool,
          totalVolumeUsd: 0,
          thresholdsUsd: [0, 100, 200],
          poolScheduleUsd: [5_000, 10_000, 20_000],
        }}
      />,
    );

    expect(getByText('$5,000.00')).toBeDefined();
    expect(getByText('$10,000.00')).toBeDefined();
    expect(queryAllByText('$5,000.00')).toHaveLength(1);
  });

  it('uses the unlocked pool when a threshold has no matching schedule entry', () => {
    const { getByText } = render(
      <CampaignPrizePool
        {...baseProps}
        prizePool={{
          ...prizePool,
          totalVolumeUsd: 0,
          thresholdsUsd: [0, 100],
          poolScheduleUsd: [10_000],
          unlockedPoolUsd: 9_000,
        }}
      />,
    );

    expect(getByText('$10,000.00')).toBeDefined();
    expect(getByText('$9,000.00')).toBeDefined();
  });

  it('renders a single unlocked-pool tier when the API returns no thresholds', () => {
    const { getByText, getByTestId } = render(
      <CampaignPrizePool
        {...baseProps}
        prizePool={{
          ...prizePool,
          thresholdsUsd: [],
          poolScheduleUsd: [],
          unlockedPoolUsd: 2_000,
        }}
      />,
    );

    expect(getByText('$2,000.00')).toBeDefined();
    expect(getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.MAX_BADGE)).toBeDefined();
  });

  it('renders an empty ladder when no prize pool is available', () => {
    const { getByText, getByTestId } = render(
      <CampaignPrizePool {...baseProps} prizePool={null} />,
    );

    expect(getByText('$0.00')).toBeDefined();
    expect(getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.MAX_BADGE)).toBeDefined();
  });
});
