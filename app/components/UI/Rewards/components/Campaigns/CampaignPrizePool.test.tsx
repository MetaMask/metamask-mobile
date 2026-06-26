import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import CampaignPrizePool, {
  CAMPAIGN_PRIZE_POOL_TEST_IDS,
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

const milestones = [
  { threshold: 0, prize: 10_000 },
  { threshold: 100, prize: 20_000 },
  { threshold: 200, prize: 30_000 },
] as const;

const baseProps = {
  milestones,
  currentVolume: 150 as number | null,
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
      <CampaignPrizePool {...baseProps} currentVolume={250} />,
    );

    expect(getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.MAX_BADGE)).toBeDefined();
    expect(getByText('Max')).toBeDefined();
    expect(getByText('$30,000.00')).toBeDefined();
    expect(queryByText('Next')).toBeNull();

    const progressBar = getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.PROGRESS_BAR);
    const innerBar = progressBar.props.children;
    expect(innerBar.props.style).toEqual({ width: '100%' });
  });

  it('shows skeleton when loading with no volume data', () => {
    const { getByTestId, queryByTestId } = render(
      <CampaignPrizePool {...baseProps} currentVolume={null} isLoading />,
    );

    expect(getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.CONTAINER)).toBeDefined();
    expect(queryByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.PROGRESS_BAR)).toBeNull();
  });

  it('shows stale content when loading but volume already exists', () => {
    const { getByTestId } = render(
      <CampaignPrizePool {...baseProps} isLoading />,
    );

    expect(
      getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.PROGRESS_BAR),
    ).toBeDefined();
  });

  it('shows error banner when hasError and no volume data', () => {
    const { getByTestId, queryByTestId } = render(
      <CampaignPrizePool {...baseProps} currentVolume={null} hasError />,
    );

    expect(
      getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.ERROR_BANNER),
    ).toBeDefined();
    expect(queryByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.PROGRESS_BAR)).toBeNull();
  });

  it('calls refetch when error retry is pressed', () => {
    const { getByTestId } = render(
      <CampaignPrizePool {...baseProps} currentVolume={null} hasError />,
    );

    fireEvent.press(
      getByTestId(`${CAMPAIGN_PRIZE_POOL_TEST_IDS.ERROR_BANNER}-retry`),
    );
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('sorts unsorted milestones before computing progress', () => {
    const { getByTestId } = render(
      <CampaignPrizePool
        {...baseProps}
        milestones={[
          { threshold: 200, prize: 30_000 },
          { threshold: 0, prize: 10_000 },
          { threshold: 100, prize: 20_000 },
        ]}
        currentVolume={150}
      />,
    );

    const progressBar = getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.PROGRESS_BAR);
    const innerBar = progressBar.props.children;
    expect(innerBar.props.style).toEqual({ width: '50%' });
  });
});
