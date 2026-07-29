import React from 'react';
import { render } from '@testing-library/react-native';
import MoneyAccountSweepstakesPrizePool from './MoneyAccountSweepstakesPrizePool';
import type { MoneyAccountSweepstakesPrizePoolDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';
import type { CampaignPrizePoolMilestone } from '../CampaignPrizePool';

let latestPrizePoolProps: {
  milestones: CampaignPrizePoolMilestone[];
  currentVolume: number | null;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => void;
} | null;

jest.mock('../CampaignPrizePool', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    CAMPAIGN_PRIZE_POOL_TEST_IDS: {
      CONTAINER: 'campaign-prize-pool-container',
    },
    default: (props: {
      milestones: CampaignPrizePoolMilestone[];
      currentVolume: number | null;
      isLoading: boolean;
      hasError: boolean;
      refetch: () => void;
    }) => {
      latestPrizePoolProps = props;
      return ReactActual.createElement(View, {
        testID: 'campaign-prize-pool',
      });
    },
  };
});

const prizePool: MoneyAccountSweepstakesPrizePoolDto = {
  totalVolumeUsd: 150,
  unlockedPoolUsd: 20,
  thresholdsUsd: [100, 200],
  poolScheduleUsd: [10, 20],
  numberOfWinners: 3,
  minPrizeUsd: 5,
  maxPrizeUsd: 50,
};

describe('MoneyAccountSweepstakesPrizePool', () => {
  beforeEach(() => {
    latestPrizePoolProps = null;
  });

  it('prepends a zero-threshold milestone when thresholds start above zero', () => {
    const refetch = jest.fn();

    render(
      <MoneyAccountSweepstakesPrizePool
        prizePool={prizePool}
        isLoading={false}
        hasError={false}
        refetch={refetch}
      />,
    );

    expect(latestPrizePoolProps).toMatchObject({
      currentVolume: 150,
      isLoading: false,
      hasError: false,
      refetch,
      milestones: [
        { threshold: 0, prize: 10 },
        { threshold: 100, prize: 10 },
        { threshold: 200, prize: 20 },
      ],
    });
  });

  it('keeps an existing zero-threshold milestone without duplicating it', () => {
    render(
      <MoneyAccountSweepstakesPrizePool
        prizePool={{
          ...prizePool,
          thresholdsUsd: [0, 100, 200],
          poolScheduleUsd: [5, 10, 20],
        }}
        isLoading={false}
        hasError={false}
        refetch={jest.fn()}
      />,
    );

    expect(latestPrizePoolProps?.milestones).toEqual([
      { threshold: 0, prize: 5 },
      { threshold: 100, prize: 10 },
      { threshold: 200, prize: 20 },
    ]);
  });

  it('passes a zero milestone and null volume when prize pool data is missing', () => {
    render(
      <MoneyAccountSweepstakesPrizePool
        prizePool={null}
        isLoading
        hasError={false}
        refetch={jest.fn()}
      />,
    );

    expect(latestPrizePoolProps).toMatchObject({
      currentVolume: null,
      isLoading: true,
      milestones: [{ threshold: 0, prize: 0 }],
    });
  });

  it('falls back to unlocked pool amount when schedule index is missing', () => {
    render(
      <MoneyAccountSweepstakesPrizePool
        prizePool={{
          ...prizePool,
          thresholdsUsd: [50],
          poolScheduleUsd: [],
          unlockedPoolUsd: 42,
        }}
        isLoading={false}
        hasError={false}
        refetch={jest.fn()}
      />,
    );

    expect(latestPrizePoolProps?.milestones).toEqual([
      { threshold: 0, prize: 42 },
      { threshold: 50, prize: 42 },
    ]);
  });
});
