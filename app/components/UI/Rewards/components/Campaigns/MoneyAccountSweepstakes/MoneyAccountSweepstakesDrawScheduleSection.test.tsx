import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import MoneyAccountSweepstakesDrawScheduleSection, {
  MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS,
} from './MoneyAccountSweepstakesDrawScheduleSection';
import {
  CampaignType,
  type CampaignDto,
  type MoneyAccountSweepstakesDrawProofDto,
  type MoneyAccountSweepstakesLocalizedTextDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';

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
    prizePool: {
      totalVolumeUsd: 100,
      unlockedPoolUsd: 10,
      thresholdsUsd: [0, 100],
      poolScheduleUsd: [10, 20],
      numberOfWinners: 1,
      minPrizeUsd: 5,
      maxPrizeUsd: 20,
    },
    isLoading: false,
    hasError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('./MoneyAccountSweepstakesPrizePool', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, {
        testID: 'money-account-sweepstakes-prize-pool',
      }),
  };
});

jest.mock('../CampaignTile.utils', () => {
  const actual = jest.requireActual('../CampaignTile.utils');
  return {
    ...actual,
    formatCampaignDateRange: () => 'Jan 1 – Jan 7',
  };
});

const localizedText: MoneyAccountSweepstakesLocalizedTextDto = {
  currentBalanceTitle: 'Current balance',
  currentBalanceDescription: 'Current balance description',
  eligibleBalanceTitle: 'Eligible balance',
  eligibleBalanceDescription: 'Eligible balance description',
  entriesTitle: 'Entries',
  entriesDescription: 'Entries description',
  entriesCountValue: '{count} / 7',
  drawScheduleTitle: 'Draw schedule',
  addFundsTitle: 'Add funds',
  addFundsNoBalanceTitle: "You don't have any balance yet",
  addFundsNoBalanceDescription:
    'Deposit crypto or mUSD in your wallet before moving them to Money Account',
  weekTitle: 'Week {number}',
  completeLabel: 'Complete',
  activeLabel: 'Active',
  joinTheSweepstakesTitle: 'Join the Sweepstakes',
  drawPendingTitle: 'Draw pending',
  drawCompleteTitle: 'Winners drawn',
  drawProofTitle: 'Draw proof',
  merkleRootLabel: 'Merkle root',
  formulaLabel: 'Formula',
  drawFormulaLabel: 'Weighted raffle (Efraimidis–Spirakis)',
  drawFormulaDescription:
    'Each day you held at least $100 in your Money Account earned you an entry.',
  seedBlockLabel: 'Seed block number',
  seedBlockHashLabel: 'Seed block hash',
  drawProofEntriesLabel: 'Entries',
  winnersLabel: 'Winners',
  reservesLabel: 'Reserves',
  originalDrawTitle: 'Original draw',
  reserveSuffix: '(reserve)',
  refLabel: 'Ref',
  weightLabel: 'Weight',
  bindingConflictTitle: 'Money Account already linked',
  bindingConflictDescription:
    'Money Account already binds to another Rewards profile.',
  onTrackDescription: "You are on track to earn today's entry.",
  belowThresholdDescription:
    "Maintain a balance of $100 or more in your Money Account to earn tomorrow's entry.",
};

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
    expect(getByText('Week 1')).toBeOnTheScreen();
    expect(getByText('Jan 1 – Jan 7')).toBeOnTheScreen();
  });

  it('renders active week with prize pool', () => {
    const active = buildCampaign({
      id: 'active-week',
      startDate: '2025-01-08T00:00:00.000Z',
      endDate: '2025-01-15T00:00:00.000Z',
    });

    const { getByTestId, getByText } = render(
      <MoneyAccountSweepstakesDrawScheduleSection
        campaigns={[active]}
        localizedText={localizedText}
      />,
    );

    expect(getByText('Week 1 · Active')).toBeOnTheScreen();
    expect(
      getByTestId('money-account-sweepstakes-prize-pool'),
    ).toBeOnTheScreen();
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

    expect(getByText('Week 1 · Complete')).toBeOnTheScreen();
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

    expect(getByText('Week 1 · Complete')).toBeOnTheScreen();
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
