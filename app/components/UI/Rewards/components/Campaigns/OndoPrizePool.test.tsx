import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OndoPrizePool, {
  ONDO_PRIZE_POOL_TEST_IDS,
  getCurrentPrize,
} from './OndoPrizePool';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

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
      'rewards.ondo_campaign_prize_pool.error_title':
        'Failed to load prize pool',
      'rewards.ondo_campaign_prize_pool.error_description':
        'There was an error loading the prize pool. Please try again.',
      'rewards.ondo_campaign_prize_pool.retry_button': 'Retry',
      'rewards.ondo_campaign_prize_pool.current_label': 'Current',
      'rewards.ondo_campaign_prize_pool.next_label': 'Next',
      'rewards.ondo_campaign_prize_pool.volume_subtext':
        '{{current}} of {{target}} volume',
      'rewards.ondo_campaign_prize_pool.max_tier_subtext':
        '{{maxThreshold}}+ TVL — all milestones reached',
      'rewards.ondo_campaign_prize_pool.max_badge': 'Max',
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

const baseProps = {
  totalUsdDeposited: '2000000.000000' as string | null,
  isLoading: false,
  hasError: false,
  refetch: mockRefetch,
};

describe('OndoPrizePool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders container, progress bar, and subtext when data is provided', () => {
    const { getByTestId } = render(<OndoPrizePool {...baseProps} />);

    expect(getByTestId(ONDO_PRIZE_POOL_TEST_IDS.CONTAINER)).toBeDefined();
    expect(getByTestId(ONDO_PRIZE_POOL_TEST_IDS.PROGRESS_BAR)).toBeDefined();
    expect(getByTestId(ONDO_PRIZE_POOL_TEST_IDS.SUBTEXT)).toBeDefined();
  });

  it('shows correct subtext for deposits between breakpoints', () => {
    const { getByTestId } = render(
      <OndoPrizePool {...baseProps} totalUsdDeposited="2000000.000000" />,
    );

    const subtext = getByTestId(ONDO_PRIZE_POOL_TEST_IDS.SUBTEXT);
    expect(subtext.props.children).toBe('$2M of $3.5M volume');
  });

  it('shows $25,000.00 prize at $0 deposits (first bracket)', () => {
    const { getByText } = render(
      <OndoPrizePool {...baseProps} totalUsdDeposited="0" />,
    );

    expect(getByText('$25,000.00')).toBeDefined();
    expect(getByText('$50,000.00')).toBeDefined();
  });

  it('shows only current prize at max tier with no next label', () => {
    const { getByText, queryByText, getByTestId } = render(
      <OndoPrizePool {...baseProps} totalUsdDeposited="7000000" />,
    );

    expect(getByText('$100,000.00')).toBeDefined();
    expect(queryByText('Next')).toBeNull();

    const subtext = getByTestId(ONDO_PRIZE_POOL_TEST_IDS.SUBTEXT);
    expect(subtext.props.children).toBe('$6M+ TVL — all milestones reached');

    const progressBar = getByTestId(ONDO_PRIZE_POOL_TEST_IDS.PROGRESS_BAR);
    const innerBar = progressBar.props.children;
    expect(innerBar.props.style).toEqual({ width: '100%' });
  });

  it('shows max badge when at max tier', () => {
    const { getByTestId, getByText } = render(
      <OndoPrizePool {...baseProps} totalUsdDeposited="7000000" />,
    );

    expect(getByTestId(ONDO_PRIZE_POOL_TEST_IDS.MAX_BADGE)).toBeDefined();
    expect(getByText('Max')).toBeDefined();
  });

  it('does not show max badge when not at max tier', () => {
    const { queryByTestId } = render(
      <OndoPrizePool {...baseProps} totalUsdDeposited="2000000" />,
    );

    expect(queryByTestId(ONDO_PRIZE_POOL_TEST_IDS.MAX_BADGE)).toBeNull();
  });

  it('calculates correct progress for $2M deposits (between $1.5M and $3.5M)', () => {
    const { getByTestId } = render(
      <OndoPrizePool {...baseProps} totalUsdDeposited="2000000" />,
    );

    const progressBar = getByTestId(ONDO_PRIZE_POOL_TEST_IDS.PROGRESS_BAR);
    const innerBar = progressBar.props.children;
    expect(innerBar.props.style).toEqual({ width: '25%' });
  });

  it('shows skeleton when loading with no data', () => {
    const { getByTestId, queryByTestId } = render(
      <OndoPrizePool {...baseProps} totalUsdDeposited={null} isLoading />,
    );

    expect(getByTestId(ONDO_PRIZE_POOL_TEST_IDS.CONTAINER)).toBeDefined();
    expect(queryByTestId(ONDO_PRIZE_POOL_TEST_IDS.PROGRESS_BAR)).toBeNull();
    expect(queryByTestId(ONDO_PRIZE_POOL_TEST_IDS.SUBTEXT)).toBeNull();
  });

  it('shows stale data when loading with existing data (SWR)', () => {
    const { getByTestId } = render(<OndoPrizePool {...baseProps} isLoading />);

    expect(getByTestId(ONDO_PRIZE_POOL_TEST_IDS.PROGRESS_BAR)).toBeDefined();
    expect(getByTestId(ONDO_PRIZE_POOL_TEST_IDS.SUBTEXT)).toBeDefined();
  });

  it('shows error banner when hasError is true with no data', () => {
    const { getByTestId, queryByTestId } = render(
      <OndoPrizePool {...baseProps} totalUsdDeposited={null} hasError />,
    );

    expect(getByTestId(ONDO_PRIZE_POOL_TEST_IDS.ERROR_BANNER)).toBeDefined();
    expect(queryByTestId(ONDO_PRIZE_POOL_TEST_IDS.PROGRESS_BAR)).toBeNull();
  });

  it('hides error banner when stale data exists', () => {
    const { queryByTestId, getByTestId } = render(
      <OndoPrizePool {...baseProps} hasError />,
    );

    expect(queryByTestId(ONDO_PRIZE_POOL_TEST_IDS.ERROR_BANNER)).toBeNull();
    expect(getByTestId(ONDO_PRIZE_POOL_TEST_IDS.PROGRESS_BAR)).toBeDefined();
  });

  it('calls refetch on error retry press', () => {
    const { getByTestId } = render(
      <OndoPrizePool {...baseProps} totalUsdDeposited={null} hasError />,
    );

    fireEvent.press(
      getByTestId(`${ONDO_PRIZE_POOL_TEST_IDS.ERROR_BANNER}-retry`),
    );
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});

describe('getCurrentPrize', () => {
  it('returns $25,000 for $0 deposits', () => {
    expect(getCurrentPrize(0)).toBe(25_000);
  });

  it('returns $25,000 for deposits below $1.5M', () => {
    expect(getCurrentPrize(500_000)).toBe(25_000);
    expect(getCurrentPrize(1_499_999)).toBe(25_000);
  });

  it('returns $50,000 at exactly $1.5M', () => {
    expect(getCurrentPrize(1_500_000)).toBe(50_000);
  });

  it('returns $50,000 for deposits between $1.5M and $3.5M', () => {
    expect(getCurrentPrize(2_000_000)).toBe(50_000);
    expect(getCurrentPrize(3_499_999)).toBe(50_000);
  });

  it('returns $75,000 at exactly $3.5M', () => {
    expect(getCurrentPrize(3_500_000)).toBe(75_000);
  });

  it('returns $75,000 for deposits between $3.5M and $6M', () => {
    expect(getCurrentPrize(4_500_000)).toBe(75_000);
    expect(getCurrentPrize(5_999_999)).toBe(75_000);
  });

  it('returns $100,000 at exactly $6M', () => {
    expect(getCurrentPrize(6_000_000)).toBe(100_000);
  });

  it('returns $100,000 for deposits above $6M', () => {
    expect(getCurrentPrize(10_000_000)).toBe(100_000);
  });
});
