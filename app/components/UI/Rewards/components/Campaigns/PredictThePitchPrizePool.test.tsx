import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PredictThePitchPrizePool, {
  PREDICT_THE_PITCH_PRIZE_POOL_TEST_IDS,
} from './PredictThePitchPrizePool';
import type { PredictThePitchPrizePoolDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

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
    const text: Record<string, string> = {
      'rewards.campaign_prize_pool.current_label': 'Current',
      'rewards.campaign_prize_pool.next_label': 'Next',
      'rewards.campaign_prize_pool.volume_subtext':
        '{{current}} of {{target}} volume',
      'rewards.campaign_prize_pool.max_tier_subtext':
        '{{maxThreshold}}+ TVL — all milestones reached',
      'rewards.campaign_prize_pool.max_badge': 'Max',
      'rewards.campaign_prize_pool.error_title': 'Failed to load prize pool',
      'rewards.campaign_prize_pool.error_description': 'Try again',
      'rewards.campaign_prize_pool.retry': 'Retry',
    };
    let result = text[key] ?? key;
    Object.entries(params ?? {}).forEach(([paramKey, value]) => {
      result = result.replace(`{{${paramKey}}}`, value);
    });
    return result;
  },
}));

jest.mock('../../utils/formatUtils', () => ({
  formatUsd: (value: number) => `$${value.toFixed(2)}`,
  formatCompactUsd: (value: number) => `$${value}`,
}));

const TEST_IDS = PREDICT_THE_PITCH_PRIZE_POOL_TEST_IDS;

const prizePool: PredictThePitchPrizePoolDto = {
  totalVolumeUsd: 150,
  unlockedPoolUsd: 20,
  thresholdsUsd: [0, 100, 200],
  poolScheduleUsd: [10, 20, 30],
  breakdown: [],
  computedAt: '2025-01-01T00:00:00.000Z',
};

describe('PredictThePitchPrizePool', () => {
  it('renders progress toward the next unlocked prize', () => {
    const { getByText, getByTestId } = render(
      <PredictThePitchPrizePool
        prizePool={prizePool}
        isLoading={false}
        hasError={false}
        refetch={jest.fn()}
      />,
    );

    expect(getByText('$20.00')).toBeDefined();
    expect(getByText('$30.00')).toBeDefined();
    expect(getByTestId(TEST_IDS.SUBTEXT).props.children).toBe(
      '$150 of $200 volume',
    );
    expect(
      getByTestId(TEST_IDS.PROGRESS_BAR).props.children.props.style,
    ).toEqual({ width: '50%' });
  });

  it('renders max state when all prize milestones are unlocked', () => {
    const { getByText, getByTestId, queryByText } = render(
      <PredictThePitchPrizePool
        prizePool={{
          ...prizePool,
          totalVolumeUsd: 250,
          unlockedPoolUsd: 30,
        }}
        isLoading={false}
        hasError={false}
        refetch={jest.fn()}
      />,
    );

    expect(getByText('$30.00')).toBeDefined();
    expect(queryByText('Next')).toBeNull();
    expect(getByTestId(TEST_IDS.MAX_BADGE)).toBeDefined();
  });

  it('calls refetch from the error banner', () => {
    const refetch = jest.fn();
    const { getByTestId } = render(
      <PredictThePitchPrizePool
        prizePool={null}
        isLoading={false}
        hasError
        refetch={refetch}
      />,
    );

    fireEvent.press(getByTestId(`${TEST_IDS.ERROR_BANNER}-retry`));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
