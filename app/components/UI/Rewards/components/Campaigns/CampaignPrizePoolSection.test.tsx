import React from 'react';
import { render } from '@testing-library/react-native';
import CampaignPrizePoolSection, {
  CAMPAIGN_PRIZE_POOL_SECTION_TEST_IDS,
} from './CampaignPrizePoolSection';
import {
  CAMPAIGN_PRIZE_POOL_TEST_IDS,
  type CampaignPrizePoolSchedule,
} from './CampaignPrizePool';

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) =>
    key === 'rewards.campaign_prize_pool.title' ? 'Prize pool' : key,
  default: { locale: 'en-US' },
}));

jest.mock('./CampaignPrizePool', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    CAMPAIGN_PRIZE_POOL_TEST_IDS: {
      CONTAINER: 'campaign-prize-pool-container',
    },
    default: () =>
      ReactActual.createElement(View, {
        testID: 'campaign-prize-pool-container',
      }),
  };
});

const prizePool: CampaignPrizePoolSchedule = {
  totalVolumeUsd: 150,
  unlockedPoolUsd: 20_000,
  thresholdsUsd: [0, 100],
  poolScheduleUsd: [10_000, 20_000],
};

const baseProps = {
  prizePool: prizePool as CampaignPrizePoolSchedule | null,
  isLoading: false,
  hasError: false,
  refetch: jest.fn(),
};

describe('CampaignPrizePoolSection', () => {
  it('renders the heading and the ladder when data is present', () => {
    const { getByTestId, getByText } = render(
      <CampaignPrizePoolSection {...baseProps} />,
    );

    expect(
      getByTestId(CAMPAIGN_PRIZE_POOL_SECTION_TEST_IDS.CONTAINER),
    ).toBeDefined();
    expect(getByText('Prize pool')).toBeDefined();
    expect(getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('renders the heading while loading with no data yet', () => {
    const { getByTestId } = render(
      <CampaignPrizePoolSection {...baseProps} prizePool={null} isLoading />,
    );

    expect(
      getByTestId(CAMPAIGN_PRIZE_POOL_SECTION_TEST_IDS.HEADING),
    ).toBeDefined();
  });

  it('renders the heading on error with no data', () => {
    const { getByTestId } = render(
      <CampaignPrizePoolSection {...baseProps} prizePool={null} hasError />,
    );

    expect(
      getByTestId(CAMPAIGN_PRIZE_POOL_SECTION_TEST_IDS.HEADING),
    ).toBeDefined();
  });

  it('renders nothing at all with no data, no load and no error', () => {
    // The heading has to go with the ladder — a lone "Prize pool" title above
    // empty space reads worse than having no section.
    const { queryByTestId, queryByText } = render(
      <CampaignPrizePoolSection {...baseProps} prizePool={null} />,
    );

    expect(
      queryByTestId(CAMPAIGN_PRIZE_POOL_SECTION_TEST_IDS.CONTAINER),
    ).toBeNull();
    expect(
      queryByTestId(CAMPAIGN_PRIZE_POOL_SECTION_TEST_IDS.HEADING),
    ).toBeNull();
    expect(queryByText('Prize pool')).toBeNull();
    expect(queryByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.CONTAINER)).toBeNull();
  });

  it('keeps the section while a refresh over existing data fails', () => {
    const { getByTestId } = render(
      <CampaignPrizePoolSection {...baseProps} isLoading hasError />,
    );

    expect(getByTestId(CAMPAIGN_PRIZE_POOL_TEST_IDS.CONTAINER)).toBeDefined();
  });
});
