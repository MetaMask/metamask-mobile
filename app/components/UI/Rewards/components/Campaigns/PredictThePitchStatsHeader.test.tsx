import React from 'react';
import { render } from '@testing-library/react-native';
import { TextColor } from '@metamask/design-system-react-native';
import PredictThePitchStatsHeader, {
  PREDICT_THE_PITCH_STATS_HEADER_TEST_IDS,
} from './PredictThePitchStatsHeader';
import type { PredictThePitchLeaderboardPositionDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

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

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../utils/formatUtils', () => ({
  formatPercentChange: (value: number) =>
    `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`,
  formatRewardsTimeOnly: () => 'time-stub',
}));

const TEST_IDS = PREDICT_THE_PITCH_STATS_HEADER_TEST_IDS;

const basePosition: PredictThePitchLeaderboardPositionDto = {
  rank: 7,
  totalParticipants: 100,
  roi: 0.125,
  pnl: 25,
  volume: 200,
  eligible: true,
  neighbors: [],
  computedAt: '2025-01-01T00:00:00.000Z',
  marketsTraded: 3,
  minimumMarketsTraded: 3,
};

describe('PredictThePitchStatsHeader', () => {
  it('renders container and your-rank label', () => {
    const { getByTestId, getByText } = render(
      <PredictThePitchStatsHeader position={basePosition} />,
    );
    expect(getByTestId(TEST_IDS.CONTAINER)).toBeDefined();
    expect(
      getByText('rewards.predict_the_pitch_campaign.label_your_rank'),
    ).toBeDefined();
  });

  it('shows padded rank, positive ROI with success color, and eligible icon', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <PredictThePitchStatsHeader position={basePosition} isLoading={false} />,
    );
    expect(getByTestId(TEST_IDS.RANK_VALUE).props.children).toBe('07');
    expect(getByTestId(TEST_IDS.SUBTEXT_VALUE).props.color).toBe(
      TextColor.SuccessDefault,
    );
    expect(getByText('+12.50%')).toBeDefined();
    expect(getByTestId(TEST_IDS.QUALIFIED_ICON)).toBeDefined();
    expect(queryByTestId(TEST_IDS.PENDING_TAG)).toBeNull();
  });

  it('uses error color for negative ROI', () => {
    const { getByTestId } = render(
      <PredictThePitchStatsHeader position={{ ...basePosition, roi: -0.1 }} />,
    );
    expect(getByTestId(TEST_IDS.SUBTEXT_VALUE).props.color).toBe(
      TextColor.ErrorDefault,
    );
  });

  it('shows pending tag when not eligible', () => {
    const { getByTestId, queryByTestId } = render(
      <PredictThePitchStatsHeader
        position={{ ...basePosition, eligible: false }}
      />,
    );
    expect(getByTestId(TEST_IDS.PENDING_TAG)).toBeDefined();
    expect(queryByTestId(TEST_IDS.QUALIFIED_ICON)).toBeNull();
  });

  it('hides pending tag when campaign is complete', () => {
    const { queryByTestId } = render(
      <PredictThePitchStatsHeader
        position={{ ...basePosition, eligible: false }}
        isCampaignComplete
      />,
    );
    expect(queryByTestId(TEST_IDS.PENDING_TAG)).toBeNull();
  });

  it('shows em dashes for rank and ROI when position is null', () => {
    const { getByTestId } = render(
      <PredictThePitchStatsHeader position={null} />,
    );
    expect(getByTestId(TEST_IDS.RANK_VALUE).props.children).toBe('—');
    expect(getByTestId(TEST_IDS.SUBTEXT_VALUE).props.children).toBe('—');
    expect(getByTestId(TEST_IDS.SUBTEXT_VALUE).props.color).toBe(
      TextColor.TextDefault,
    );
  });

  it('hides ROI and computed-at when showRoi and showComputedAt are false', () => {
    const { queryByTestId } = render(
      <PredictThePitchStatsHeader
        position={basePosition}
        showRoi={false}
        showComputedAt={false}
      />,
    );
    expect(queryByTestId(TEST_IDS.SUBTEXT_VALUE)).toBeNull();
    expect(queryByTestId(TEST_IDS.COMPUTED_AT)).toBeNull();
  });

  it('shows computed-at line when position has a timestamp', () => {
    const { getByTestId } = render(
      <PredictThePitchStatsHeader position={basePosition} showComputedAt />,
    );
    expect(getByTestId(TEST_IDS.COMPUTED_AT).props.children).toBe(
      'rewards.predict_the_pitch_campaign.last_updated',
    );
  });

  it('hides rank and ROI when loading', () => {
    const { queryByTestId, getByTestId } = render(
      <PredictThePitchStatsHeader position={basePosition} isLoading />,
    );
    expect(getByTestId(TEST_IDS.CONTAINER)).toBeDefined();
    expect(queryByTestId(TEST_IDS.RANK_VALUE)).toBeNull();
    expect(queryByTestId(TEST_IDS.SUBTEXT_VALUE)).toBeNull();
  });
});
