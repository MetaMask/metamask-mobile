import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import MoneyAccountSweepstakesDrawScheduleSection, {
  MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS,
} from './MoneyAccountSweepstakesDrawScheduleSection';
import {
  CampaignType,
  type CampaignDto,
  type MoneyAccountSweepstakesDrawProofDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { createMoneyAccountSweepstakesLocalizedText } from './testUtils';

const mockGetDrawProof = jest.fn();

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    ...actual,
    Text: (props: Record<string, unknown>) =>
      ReactActual.createElement(RN.Text, props, props.children),
    Button: ({
      children,
      onPress,
      testID,
    }: {
      children: React.ReactNode;
      onPress?: () => void;
      testID?: string;
    }) =>
      ReactActual.createElement(
        RN.Pressable,
        { onPress, testID },
        ReactActual.createElement(RN.Text, null, children),
      ),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../hooks/useGetMoneyAccountSweepstakesDrawProof', () => ({
  useGetMoneyAccountSweepstakesDrawProof: (campaignId: string) =>
    mockGetDrawProof(campaignId),
}));

jest.mock('../../../hooks/useGetMoneyAccountSweepstakesPrizePool', () => ({
  useGetMoneyAccountSweepstakesPrizePool: () => ({
    prizePool: { unlockedPoolUsd: 4125 },
    isLoading: false,
    hasError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('../../../utils/formatUtils', () => ({
  formatUsd: (value: number) =>
    `$${Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
}));

jest.mock('../CampaignTile.utils', () => {
  const actual = jest.requireActual('../CampaignTile.utils');
  return {
    ...actual,
    formatCampaignDateRange: () => 'Jan 1 – Jan 7',
  };
});

const localizedText = createMoneyAccountSweepstakesLocalizedText();

const drawProof: MoneyAccountSweepstakesDrawProofDto = {
  explanation: {
    merkleRoot:
      '0x8b2a9953c4611296a827abf8c47804d7f15f4f627e174f72b62a8e43b2a2db11',
    seedBlock: 85_400_000,
    seedBlockHash:
      '0x7c1e8ab9d4f2a1b0c3e5f678901234567890abcdef1234567890abcdef123456',
    formula: 'hash(seed)',
    entryCount: 100,
    winnerCount: 3,
    reserveCount: 2,
  },
  originalDraw: [
    {
      drawOrder: 1,
      addressPrefix: '0x1111',
      refCode: 'REF1',
      weight: 10,
      isReserve: false,
    },
    {
      drawOrder: 2,
      addressPrefix: '0x2222',
      refCode: null,
      weight: 5,
      isReserve: true,
    },
  ],
  finalWinners: [],
  adjustmentTrail: [],
};

function buildCampaign(overrides: Partial<CampaignDto> = {}): CampaignDto {
  return {
    id: 'mas-week-1',
    type: CampaignType.MONEY_ACCOUNT_SWEEPSTAKES,
    name: 'Week 1',
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2025-01-08T00:00:00.000Z',
    termsAndConditions: null,
    excludedRegions: [],
    details: null,
    featured: true,
    showUpcomingDate: false,
    ...overrides,
  };
}

describe('MoneyAccountSweepstakesDrawScheduleSection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-10T12:00:00.000Z'));
    jest.clearAllMocks();
    mockGetDrawProof.mockImplementation(() => ({
      drawProof: null,
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when there are no campaigns', () => {
    const { queryByTestId } = render(
      <MoneyAccountSweepstakesDrawScheduleSection
        campaigns={[]}
        localizedText={localizedText}
      />,
    );

    expect(
      queryByTestId(MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS.CONTAINER),
    ).toBeNull();
  });

  it('renders upcoming week title and date range', () => {
    const upcoming = buildCampaign({
      id: 'upcoming-week',
      startDate: '2025-02-01T00:00:00.000Z',
      endDate: '2025-02-08T00:00:00.000Z',
    });

    const { getByTestId, getByText } = render(
      <MoneyAccountSweepstakesDrawScheduleSection
        campaigns={[upcoming]}
        localizedText={localizedText}
      />,
    );

    expect(
      getByTestId(MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText('Draw schedule')).toBeOnTheScreen();
    expect(getByText('4 weekly draws · 2 winners each')).toBeOnTheScreen();
    expect(getByText('Jan 1 – Jan 7')).toBeOnTheScreen();
    expect(getByText('Week 1')).toBeOnTheScreen();
    expect(getByText('$4,125.00')).toBeOnTheScreen();
    expect(getByText('Prize pool')).toBeOnTheScreen();
    expect(
      getByText('Entries reset after each weekly draw.'),
    ).toBeOnTheScreen();
  });

  it('renders an active week without the prize pool meter', () => {
    const active = buildCampaign({
      id: 'active-week',
      startDate: '2025-01-08T00:00:00.000Z',
      endDate: '2025-01-15T00:00:00.000Z',
    });

    const { getByText, queryByTestId } = render(
      <MoneyAccountSweepstakesDrawScheduleSection
        campaigns={[active]}
        localizedText={localizedText}
      />,
    );

    expect(getByText('Week 1 · Current draw')).toBeOnTheScreen();
    expect(getByText('$4,125.00')).toBeOnTheScreen();
    expect(queryByTestId('money-account-sweepstakes-prize-pool')).toBeNull();
  });

  it('shows draw pending for a completed week without proof', () => {
    const complete = buildCampaign({
      id: 'complete-week',
      startDate: '2024-12-01T00:00:00.000Z',
      endDate: '2024-12-08T00:00:00.000Z',
    });

    const { getByText, queryByTestId } = render(
      <MoneyAccountSweepstakesDrawScheduleSection
        campaigns={[complete]}
        localizedText={localizedText}
      />,
    );

    expect(getByText('Week 1')).toBeOnTheScreen();
    expect(getByText('Draw pending')).toBeOnTheScreen();
    expect(
      queryByTestId(
        MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS.DRAW_COMPLETE_BUTTON,
      ),
    ).toBeNull();
  });

  it('calls onOpenDrawProof for a completed week with proof', () => {
    const onOpenDrawProof = jest.fn();
    const complete = buildCampaign({
      id: 'complete-with-proof',
      startDate: '2024-12-01T00:00:00.000Z',
      endDate: '2024-12-08T00:00:00.000Z',
    });
    mockGetDrawProof.mockImplementation((campaignId: string) => ({
      drawProof: campaignId === complete.id ? drawProof : null,
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    }));

    const { getByTestId } = render(
      <MoneyAccountSweepstakesDrawScheduleSection
        campaigns={[complete]}
        localizedText={localizedText}
        onOpenDrawProof={onOpenDrawProof}
      />,
    );

    fireEvent.press(
      getByTestId(
        MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS.DRAW_COMPLETE_BUTTON,
      ),
    );

    expect(onOpenDrawProof).toHaveBeenCalledWith(drawProof);
  });

  it('numbers weeks sequentially across multiple campaigns', () => {
    const campaigns = [
      buildCampaign({
        id: 'week-a',
        startDate: '2024-12-01T00:00:00.000Z',
        endDate: '2024-12-08T00:00:00.000Z',
      }),
      buildCampaign({
        id: 'week-b',
        startDate: '2025-02-01T00:00:00.000Z',
        endDate: '2025-02-08T00:00:00.000Z',
      }),
    ];

    const { getByText, getByTestId } = render(
      <MoneyAccountSweepstakesDrawScheduleSection
        campaigns={campaigns}
        localizedText={localizedText}
      />,
    );

    expect(getByText('Week 1')).toBeOnTheScreen();
    expect(getByText('Week 2')).toBeOnTheScreen();
    expect(
      getByTestId(
        `${MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS.WEEK_ROW}-week-a`,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        `${MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS.WEEK_ROW}-week-b`,
      ),
    ).toBeOnTheScreen();
  });
});
