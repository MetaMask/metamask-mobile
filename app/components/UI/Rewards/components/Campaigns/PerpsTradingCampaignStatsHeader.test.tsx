import React from 'react';
import { render } from '@testing-library/react-native';
import { TextColor } from '@metamask/design-system-react-native';
import PerpsTradingCampaignStatsHeader, {
  PERPS_STATS_HEADER_TEST_IDS,
} from './PerpsTradingCampaignStatsHeader';
import type { PerpsTradingCampaignLeaderboardPositionDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    ...actual,
    Text: (props: Record<string, unknown>) =>
      ReactActual.createElement(RN.Text, props, props.children),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../utils/formatUtils', () => {
  const fmt = (n: number) =>
    n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  return {
    formatSignedUsd: (value: number) => {
      if (value < 0) {
        return `-$${fmt(Math.abs(value))}`;
      }
      if (value > 0) {
        return `+$${fmt(value)}`;
      }
      return '$0.00';
    },
    formatRewardsTimeOnly: () => 'time-stub',
  };
});

const TEST_IDS = PERPS_STATS_HEADER_TEST_IDS;

const basePosition: PerpsTradingCampaignLeaderboardPositionDto = {
  rank: 7,
  pnl: 1500.25,
  notionalVolume: 30_000,
  marginDeployed: 2000,
  qualified: true,
  neighbors: [],
  computedAt: '2025-01-01T00:00:00.000Z',
};

describe('PerpsTradingCampaignStatsHeader', () => {
  it('renders container and your-rank label', () => {
    const { getByTestId, getByText } = render(
      <PerpsTradingCampaignStatsHeader position={basePosition} />,
    );
    expect(getByTestId(TEST_IDS.CONTAINER)).toBeDefined();
    expect(
      getByText('rewards.perps_trading_campaign.label_your_rank'),
    ).toBeDefined();
  });

  it('shows padded rank, positive PnL with success color, and qualified icon when qualified', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <PerpsTradingCampaignStatsHeader
        position={basePosition}
        isLoading={false}
      />,
    );
    const rank = getByTestId(TEST_IDS.RANK_VALUE);
    expect(rank.props.children).toBe('07');
    const pnl = getByTestId(TEST_IDS.PNL_VALUE);
    expect(pnl.props.color).toBe(TextColor.SuccessDefault);
    expect(getByText('+$1,500.25', { exact: true })).toBeDefined();
    expect(getByTestId(TEST_IDS.QUALIFIED_ICON)).toBeDefined();
    expect(queryByTestId(TEST_IDS.PENDING_TAG)).toBeNull();
  });

  it('uses error color and minus sign in display for negative PnL', () => {
    const { getByTestId } = render(
      <PerpsTradingCampaignStatsHeader
        position={{ ...basePosition, pnl: -100, qualified: true }}
      />,
    );
    const pnl = getByTestId(TEST_IDS.PNL_VALUE);
    expect(pnl.props.color).toBe(TextColor.ErrorDefault);
  });

  it('shows pending tag and no qualified icon when not qualified', () => {
    const { getByTestId, queryByTestId } = render(
      <PerpsTradingCampaignStatsHeader
        position={{ ...basePosition, qualified: false }}
      />,
    );
    expect(getByTestId(TEST_IDS.PENDING_TAG)).toBeDefined();
    expect(queryByTestId(TEST_IDS.QUALIFIED_ICON)).toBeNull();
  });

  it('shows em dashes for rank and PnL when position is null', () => {
    const { getByTestId } = render(
      <PerpsTradingCampaignStatsHeader position={null} />,
    );
    const rank = getByTestId(TEST_IDS.RANK_VALUE);
    const pnl = getByTestId(TEST_IDS.PNL_VALUE);
    expect(rank.props.children).toBe('—');
    expect(pnl.props.children).toBe('—');
    expect(pnl.props.color).toBe(TextColor.TextDefault);
  });

  it('hides PnL and computed-at subtext when showPnl and showComputedAt are false', () => {
    const { queryByTestId } = render(
      <PerpsTradingCampaignStatsHeader
        position={basePosition}
        showPnl={false}
        showComputedAt={false}
      />,
    );
    expect(queryByTestId(TEST_IDS.PNL_VALUE)).toBeNull();
    expect(queryByTestId(TEST_IDS.COMPUTED_AT)).toBeNull();
  });

  it('shows computed-at line when showComputedAt is true and position has a timestamp', () => {
    const { getByTestId } = render(
      <PerpsTradingCampaignStatsHeader
        position={basePosition}
        showPnl
        showComputedAt
      />,
    );
    const computed = getByTestId(TEST_IDS.COMPUTED_AT);
    expect(computed.props.children).toBe(
      'rewards.perps_trading_campaign.last_updated',
    );
  });

  it('omits computed-at when formatted label is empty', () => {
    const { queryByTestId } = render(
      <PerpsTradingCampaignStatsHeader
        position={{ ...basePosition, computedAt: '' }}
        showComputedAt
      />,
    );
    expect(queryByTestId(TEST_IDS.COMPUTED_AT)).toBeNull();
  });

  it('skips rank and PnL testIDs and shows loading skeletons when isLoading is true', () => {
    const { queryByTestId, getByTestId } = render(
      <PerpsTradingCampaignStatsHeader position={basePosition} isLoading />,
    );
    expect(getByTestId(TEST_IDS.CONTAINER)).toBeDefined();
    expect(queryByTestId(TEST_IDS.RANK_VALUE)).toBeNull();
    expect(queryByTestId(TEST_IDS.PNL_VALUE)).toBeNull();
  });
});
