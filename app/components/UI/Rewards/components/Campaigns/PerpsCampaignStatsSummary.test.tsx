import React from 'react';
import { render } from '@testing-library/react-native';
import { TextColor } from '@metamask/design-system-react-native';
import PerpsCampaignStatsSummary, {
  PERPS_CAMPAIGN_STATS_SUMMARY_TEST_IDS,
} from './PerpsCampaignStatsSummary';
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

const TEST_IDS = PERPS_CAMPAIGN_STATS_SUMMARY_TEST_IDS;

const mockLeaderboard = {
  campaignId: 'c1',
  computedAt: '2025-01-01T00:00:00.000Z',
  entries: [],
  totalParticipants: 0,
};

const basePosition: PerpsTradingCampaignLeaderboardPositionDto = {
  rank: 7,
  pnl: 1500.25,
  notionalVolume: 30_000,
  marginDeployed: 2000,
  qualified: true,
  neighbors: [],
  computedAt: '2025-01-01T00:00:00.000Z',
};

describe('PerpsCampaignStatsSummary', () => {
  it('renders container and four stat labels', () => {
    const { getByTestId, getByText } = render(
      <PerpsCampaignStatsSummary
        leaderboardPosition={basePosition}
        leaderboard={mockLeaderboard}
      />,
    );

    expect(getByTestId(TEST_IDS.CONTAINER)).toBeDefined();
    expect(
      getByText('rewards.perps_trading_campaign.label_rank'),
    ).toBeDefined();
    expect(getByText('rewards.perps_trading_campaign.label_pnl')).toBeDefined();
    expect(
      getByText('rewards.perps_trading_campaign.label_volume'),
    ).toBeDefined();
    expect(
      getByText('rewards.perps_trading_campaign.label_margin'),
    ).toBeDefined();
    expect(getByText('07')).toBeDefined();
    expect(getByText('+$1,500.25')).toBeDefined();
  });

  it('uses success color for non-negative pnl', () => {
    const { getByTestId } = render(
      <PerpsCampaignStatsSummary
        leaderboardPosition={basePosition}
        leaderboard={mockLeaderboard}
      />,
    );
    const pnlCell = getByTestId(TEST_IDS.PNL);
    expect(pnlCell.props.color).toBe(TextColor.SuccessDefault);
  });

  it('uses error color for negative pnl', () => {
    const { getByTestId } = render(
      <PerpsCampaignStatsSummary
        leaderboardPosition={{ ...basePosition, pnl: -100 }}
        leaderboard={mockLeaderboard}
      />,
    );
    const pnlCell = getByTestId(TEST_IDS.PNL);
    expect(pnlCell.props.color).toBe(TextColor.ErrorDefault);
  });

  it('renders em dashes when position is null', () => {
    const { getAllByText } = render(
      <PerpsCampaignStatsSummary
        leaderboardPosition={null}
        leaderboard={null}
      />,
    );
    expect(getAllByText('—').length).toBeGreaterThanOrEqual(4);
  });

  it('shows pending tag on rank when campaign is active and user is not qualified', () => {
    const { getByTestId, queryByTestId } = render(
      <PerpsCampaignStatsSummary
        isCampaignComplete={false}
        leaderboardPosition={{ ...basePosition, qualified: false }}
        leaderboard={mockLeaderboard}
      />,
    );
    expect(getByTestId(TEST_IDS.PENDING_TAG)).toBeDefined();
    expect(queryByTestId(TEST_IDS.QUALIFIED_TAG)).toBeNull();
  });

  it('shows qualified check on rank when user is qualified', () => {
    const { getByTestId, queryByTestId } = render(
      <PerpsCampaignStatsSummary
        isCampaignComplete={false}
        leaderboardPosition={basePosition}
        leaderboard={mockLeaderboard}
      />,
    );
    expect(getByTestId(TEST_IDS.QUALIFIED_TAG)).toBeDefined();
    expect(queryByTestId(TEST_IDS.PENDING_TAG)).toBeNull();
  });

  it('does not show pending tag on rank when campaign is complete and user is not qualified', () => {
    const { queryByTestId } = render(
      <PerpsCampaignStatsSummary
        isCampaignComplete
        leaderboardPosition={{ ...basePosition, qualified: false }}
        leaderboard={mockLeaderboard}
      />,
    );
    expect(queryByTestId(TEST_IDS.PENDING_TAG)).toBeNull();
    expect(queryByTestId(TEST_IDS.QUALIFIED_TAG)).toBeNull();
  });

  it('shows qualified check when campaign is complete and user is qualified', () => {
    const { getByTestId, queryByTestId } = render(
      <PerpsCampaignStatsSummary
        isCampaignComplete
        leaderboardPosition={basePosition}
        leaderboard={mockLeaderboard}
      />,
    );
    expect(getByTestId(TEST_IDS.QUALIFIED_TAG)).toBeDefined();
    expect(queryByTestId(TEST_IDS.PENDING_TAG)).toBeNull();
  });

  it("shows You're qualified card when campaign is active and user is qualified", () => {
    const { getByTestId, queryByTestId } = render(
      <PerpsCampaignStatsSummary
        isCampaignComplete={false}
        leaderboardPosition={basePosition}
        leaderboard={mockLeaderboard}
      />,
    );
    expect(getByTestId(TEST_IDS.QUALIFIED_CARD)).toBeDefined();
    expect(queryByTestId(TEST_IDS.QUALIFY_FOR_RANK_CARD)).toBeNull();
  });

  it("hides You're qualified card when campaign is complete", () => {
    const { queryByTestId } = render(
      <PerpsCampaignStatsSummary
        isCampaignComplete
        leaderboardPosition={basePosition}
        leaderboard={mockLeaderboard}
      />,
    );
    expect(queryByTestId(TEST_IDS.QUALIFIED_CARD)).toBeNull();
  });

  it('shows Qualify for rank card when pending and below qualification thresholds', () => {
    const { getByTestId, queryByTestId } = render(
      <PerpsCampaignStatsSummary
        isCampaignComplete={false}
        leaderboardPosition={{
          ...basePosition,
          qualified: false,
          notionalVolume: 5_000,
          marginDeployed: 200,
        }}
        leaderboard={mockLeaderboard}
      />,
    );
    expect(getByTestId(TEST_IDS.QUALIFY_FOR_RANK_CARD)).toBeDefined();
    expect(queryByTestId(TEST_IDS.QUALIFIED_CARD)).toBeNull();
  });

  it('hides Qualify for rank card when notional volume already meets threshold even if still pending', () => {
    const { queryByTestId } = render(
      <PerpsCampaignStatsSummary
        isCampaignComplete={false}
        leaderboardPosition={{
          ...basePosition,
          qualified: false,
          notionalVolume: 30_000,
          marginDeployed: 2_000,
        }}
        leaderboard={mockLeaderboard}
      />,
    );
    expect(queryByTestId(TEST_IDS.QUALIFY_FOR_RANK_CARD)).toBeNull();
  });
});
