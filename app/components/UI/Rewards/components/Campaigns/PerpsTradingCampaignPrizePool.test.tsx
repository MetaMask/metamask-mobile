import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsTradingCampaignPrizePool, {
  PERPS_PRIZE_POOL_TEST_IDS,
} from './PerpsTradingCampaignPrizePool';

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
      'rewards.perps_trading_campaign.prize_pool_error_title':
        'Prize pool unavailable',
      'rewards.perps_trading_campaign.prize_pool_error_description':
        'Could not load prize pool.',
      'rewards.perps_trading_campaign.prize_pool_retry_button': 'Retry',
      'rewards.perps_trading_campaign.prize_pool_current_label': 'Current',
      'rewards.perps_trading_campaign.prize_pool_next_label': 'Next',
      'rewards.perps_trading_campaign.prize_pool_volume_subtext':
        '{{current}} of {{target}} volume',
      'rewards.perps_trading_campaign.prize_pool_max_tier_subtext':
        '{{maxThreshold}}+ volume — all milestones reached',
      'rewards.perps_trading_campaign.prize_pool_max_badge': 'Max prize',
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
  totalNotionalVolume: '7500000' as string | null,
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
      <PerpsTradingCampaignPrizePool
        {...baseProps}
        totalNotionalVolume="7500000"
      />,
    );

    expect(getByText('$15,000.00')).toBeDefined();
    expect(getByText('$20,000.00')).toBeDefined();
  });

  it('computes 50% progress halfway between $5M and $10M volume', () => {
    const { getByTestId } = render(
      <PerpsTradingCampaignPrizePool
        {...baseProps}
        totalNotionalVolume="7500000"
      />,
    );

    const progressBar = getByTestId(PERPS_PRIZE_POOL_TEST_IDS.PROGRESS_BAR);
    const innerBar = progressBar.props.children;
    expect(innerBar.props.style).toEqual({ width: '50%' });
  });

  it('shows max badge and full progress at $40M notional (top tier)', () => {
    const { getByTestId, getByText, queryByText } = render(
      <PerpsTradingCampaignPrizePool
        {...baseProps}
        totalNotionalVolume="40000000"
      />,
    );

    expect(getByTestId(PERPS_PRIZE_POOL_TEST_IDS.MAX_BADGE)).toBeDefined();
    expect(getByText('Max prize')).toBeDefined();
    expect(getByText('$50,000.00')).toBeDefined();
    expect(queryByText('Next')).toBeNull();

    const progressBar = getByTestId(PERPS_PRIZE_POOL_TEST_IDS.PROGRESS_BAR);
    const innerBar = progressBar.props.children;
    expect(innerBar.props.style).toEqual({ width: '100%' });

    const subtext = getByTestId(PERPS_PRIZE_POOL_TEST_IDS.SUBTEXT);
    expect(subtext.props.children).toBe(
      '$40M+ volume — all milestones reached',
    );
  });

  it('does not show max badge below top tier', () => {
    const { queryByTestId } = render(
      <PerpsTradingCampaignPrizePool
        {...baseProps}
        totalNotionalVolume="10000000"
      />,
    );

    expect(queryByTestId(PERPS_PRIZE_POOL_TEST_IDS.MAX_BADGE)).toBeNull();
  });

  it('with null volume and not loading, shows first-tier defaults ($10k → $15k)', () => {
    const { getByText, getByTestId } = render(
      <PerpsTradingCampaignPrizePool
        {...baseProps}
        totalNotionalVolume={null}
        isLoading={false}
      />,
    );

    expect(getByText('$10,000.00')).toBeDefined();
    expect(getByText('$15,000.00')).toBeDefined();
    const progressBar = getByTestId(PERPS_PRIZE_POOL_TEST_IDS.PROGRESS_BAR);
    const innerBar = progressBar.props.children;
    expect(innerBar.props.style).toEqual({ width: '0%' });
  });

  it('with zero notional string uses first milestone segment (0% in range to $5M)', () => {
    const { getByTestId } = render(
      <PerpsTradingCampaignPrizePool {...baseProps} totalNotionalVolume="0" />,
    );

    const progressBar = getByTestId(PERPS_PRIZE_POOL_TEST_IDS.PROGRESS_BAR);
    const innerBar = progressBar.props.children;
    expect(innerBar.props.style).toEqual({ width: '0%' });
  });

  it('shows skeleton when loading with no volume data', () => {
    const { getByTestId, queryByTestId } = render(
      <PerpsTradingCampaignPrizePool
        {...baseProps}
        totalNotionalVolume={null}
        isLoading
      />,
    );

    expect(getByTestId(PERPS_PRIZE_POOL_TEST_IDS.CONTAINER)).toBeDefined();
    expect(queryByTestId(PERPS_PRIZE_POOL_TEST_IDS.PROGRESS_BAR)).toBeNull();
    expect(queryByTestId(PERPS_PRIZE_POOL_TEST_IDS.SUBTEXT)).toBeNull();
  });

  it('shows stale content when loading but volume already exists', () => {
    const { getByTestId } = render(
      <PerpsTradingCampaignPrizePool {...baseProps} isLoading />,
    );

    expect(getByTestId(PERPS_PRIZE_POOL_TEST_IDS.PROGRESS_BAR)).toBeDefined();
    expect(getByTestId(PERPS_PRIZE_POOL_TEST_IDS.SUBTEXT)).toBeDefined();
  });

  it('shows error banner when hasError and no volume data', () => {
    const { getByTestId, queryByTestId } = render(
      <PerpsTradingCampaignPrizePool
        {...baseProps}
        totalNotionalVolume={null}
        hasError
      />,
    );

    expect(getByTestId(PERPS_PRIZE_POOL_TEST_IDS.ERROR_BANNER)).toBeDefined();
    expect(queryByTestId(PERPS_PRIZE_POOL_TEST_IDS.PROGRESS_BAR)).toBeNull();
  });

  it('hides error banner when hasError but stale volume exists', () => {
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
        totalNotionalVolume={null}
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
      <PerpsTradingCampaignPrizePool
        {...baseProps}
        totalNotionalVolume="7500000"
      />,
    );

    const subtext = getByTestId(PERPS_PRIZE_POOL_TEST_IDS.SUBTEXT);
    expect(subtext.props.children).toBe('$7.5M of $10M volume');
  });
});
