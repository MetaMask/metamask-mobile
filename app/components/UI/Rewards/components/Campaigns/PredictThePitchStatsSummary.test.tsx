import React from 'react';
import { render } from '@testing-library/react-native';
import { TextColor } from '@metamask/design-system-react-native';
import PredictThePitchStatsSummary, {
  PREDICT_THE_PITCH_STATS_SUMMARY_TEST_IDS,
} from './PredictThePitchStatsSummary';
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

jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID }),
  };
});

jest.mock('./CampaignOutcomeBanners', () => ({
  CampaignOutcomeBanner: () => null,
}));

jest.mock('../../utils/formatUtils', () => ({
  formatPercentChange: (value: number) =>
    `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`,
  formatSignedUsd: (value: number) =>
    `${value >= 0 ? '+' : '-'}$${Math.abs(value).toFixed(2)}`,
  formatUsd: (value: number) => `$${value.toFixed(2)}`,
  formatRewardsTimeOnly: () => '3:00 PM',
}));

const TEST_IDS = PREDICT_THE_PITCH_STATS_SUMMARY_TEST_IDS;

const basePosition: PredictThePitchLeaderboardPositionDto = {
  rank: 3,
  totalParticipants: 50,
  roi: 0.125,
  pnl: 12.5,
  volume: 100,
  eligible: true,
  neighbors: [],
  computedAt: '2025-01-01T00:00:00.000Z',
  marketsTraded: 3,
  minimumMarketsTraded: 3,
};

describe('PredictThePitchStatsSummary', () => {
  it('renders rank, ROI, and total volume', () => {
    const { getByTestId, getByText } = render(
      <PredictThePitchStatsSummary
        leaderboardPosition={basePosition}
        isLoading={false}
        hasError={false}
        refetch={jest.fn()}
      />,
    );

    expect(getByTestId(TEST_IDS.CONTAINER)).toBeDefined();
    expect(getByText('03')).toBeDefined();
    expect(getByText('+12.50%')).toBeDefined();
    expect(getByText('$100.00')).toBeDefined();
  });

  it('shows dash for invalid rank', () => {
    const { getByTestId } = render(
      <PredictThePitchStatsSummary
        leaderboardPosition={{ ...basePosition, rank: null }}
        isLoading={false}
        hasError={false}
        refetch={jest.fn()}
      />,
    );

    expect(getByTestId(TEST_IDS.RANK).props.children).toBe('-');
  });

  it('uses profit and loss colors for ROI', () => {
    const { getByTestId } = render(
      <PredictThePitchStatsSummary
        leaderboardPosition={{ ...basePosition, roi: -0.1 }}
        isLoading={false}
        hasError={false}
        refetch={jest.fn()}
      />,
    );

    expect(getByTestId(TEST_IDS.ROI).props.color).toBe(TextColor.ErrorDefault);
  });

  it('shows x/y markets when below minimum', () => {
    const { getByTestId } = render(
      <PredictThePitchStatsSummary
        leaderboardPosition={{
          ...basePosition,
          marketsTraded: 2,
          minimumMarketsTraded: 3,
        }}
        isLoading={false}
        hasError={false}
        refetch={jest.fn()}
      />,
    );

    expect(getByTestId(TEST_IDS.MARKETS_TRADED).props.children).toBe('2/3');
  });

  it('shows count only when markets traded meets minimum', () => {
    const { getByTestId } = render(
      <PredictThePitchStatsSummary
        leaderboardPosition={{
          ...basePosition,
          marketsTraded: 5,
          minimumMarketsTraded: 3,
        }}
        isLoading={false}
        hasError={false}
        refetch={jest.fn()}
      />,
    );

    expect(getByTestId(TEST_IDS.MARKETS_TRADED).props.children).toBe('5');
  });

  it('hides the markets traded cell when marketsTraded is null', () => {
    const { queryByTestId } = render(
      <PredictThePitchStatsSummary
        leaderboardPosition={{
          ...basePosition,
          marketsTraded: null,
          minimumMarketsTraded: 3,
        }}
        isLoading={false}
        hasError={false}
        refetch={jest.fn()}
      />,
    );

    expect(queryByTestId(TEST_IDS.MARKETS_TRADED)).toBeNull();
  });

  it('hides the markets traded cell when leaderboardPosition is null', () => {
    const { queryByTestId } = render(
      <PredictThePitchStatsSummary
        leaderboardPosition={null}
        isLoading={false}
        hasError={false}
        refetch={jest.fn()}
      />,
    );

    expect(queryByTestId(TEST_IDS.MARKETS_TRADED)).toBeNull();
  });

  it('renders an error banner when no stats are available', () => {
    const { getByTestId } = render(
      <PredictThePitchStatsSummary
        leaderboardPosition={null}
        isLoading={false}
        hasError
        refetch={jest.fn()}
      />,
    );

    expect(getByTestId(TEST_IDS.STATS_ERROR)).toBeDefined();
  });
});
