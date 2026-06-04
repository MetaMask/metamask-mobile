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
}));

const TEST_IDS = PREDICT_THE_PITCH_STATS_SUMMARY_TEST_IDS;

const basePosition: PredictThePitchLeaderboardPositionDto = {
  rank: 3,
  totalParticipants: 50,
  roi: 0.125,
  pnl: 25,
  capitalDeployed: 100,
  marketCount: 4,
  eligible: true,
  neighbors: [],
  computedAt: '2025-01-01T00:00:00.000Z',
  updateIntervalMinutes: 5,
};

describe('PredictThePitchStatsSummary', () => {
  it('renders rank, ROI, total volume, and PnL', () => {
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
    expect(getByText('+$25.00')).toBeDefined();
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

  it('uses profit and loss colors for ROI and PnL', () => {
    const { getByTestId } = render(
      <PredictThePitchStatsSummary
        leaderboardPosition={{ ...basePosition, roi: -0.1, pnl: -5 }}
        isLoading={false}
        hasError={false}
        refetch={jest.fn()}
      />,
    );

    expect(getByTestId(TEST_IDS.ROI).props.color).toBe(TextColor.ErrorDefault);
    expect(getByTestId(TEST_IDS.PNL).props.color).toBe(TextColor.ErrorDefault);
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
