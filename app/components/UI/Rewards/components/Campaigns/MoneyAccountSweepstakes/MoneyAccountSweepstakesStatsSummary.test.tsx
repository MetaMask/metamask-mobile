import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import MoneyAccountSweepstakesStatsSummary, {
  MONEY_ACCOUNT_SWEEPSTAKES_STATS_SUMMARY_TEST_IDS,
} from './MoneyAccountSweepstakesStatsSummary';
import type {
  MoneyAccountSweepstakesLocalizedTextDto,
  MoneyAccountSweepstakesStatsMeDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    ...actual,
    Text: (props: Record<string, unknown>) =>
      ReactActual.createElement(RN.Text, props, props.children),
    Icon: ({ name, testID, ...props }: { name?: string; testID?: string }) =>
      ReactActual.createElement(RN.Text, {
        testID,
        accessibilityLabel: name,
        ...props,
      }),
    ButtonIcon: ({
      onPress,
      ...props
    }: {
      onPress?: () => void;
      testID?: string;
    }) =>
      ReactActual.createElement(RN.Pressable, {
        onPress,
        testID: props.testID ?? 'stats-info-button',
      }),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../utils/formatUtils', () => ({
  formatUsd: (value: number | null) =>
    value == null ? '—' : `$${value.toFixed(2)}`,
}));

const TEST_IDS = MONEY_ACCOUNT_SWEEPSTAKES_STATS_SUMMARY_TEST_IDS;

const localizedText: MoneyAccountSweepstakesLocalizedTextDto = {
  eligibleBalanceTitle: 'Qualifying deposits',
  eligibleBalanceDescription:
    "Net new deposits in your Money Account since you joined. Reach $100 and don't drop below it before midnight UTC to earn today's entry. Balance from before joining doesn't count.",
  entriesTitle: 'Entries',
  entriesDescription:
    'One entry for each UTC day your qualifying deposits stayed at $100 or above. Max 7 per week.',
  entriesCountValue: '{count} / 7',
  drawScheduleTitle: 'Draw schedule',
  addFundsTitle: 'Add funds',
  addFundsNoBalanceTitle: 'No balance to deposit into Money Account',
  addFundsNoBalanceDescription:
    'Deposit crypto or mUSD in your wallet before transferring them to Money Account.',
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
    "Each day your qualifying deposits stayed at $100 or above earned an entry (counted from the day you joined). After the week ended, we locked everyone's entries and published a commitment (the Merkle root) before the random seed existed. The seed is a future block hash nobody can predict. We then run a weighted raffle: more entries improve your odds but don't guarantee a win. Anyone can re-check the commitment, seed, and formula to verify the ranking.",
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
  notYetQualifiedDescription:
    "Deposit the shortfall to reach $100 and hold through midnight UTC for today's entry.",
  lostTodayDescription:
    "Today's entry is forfeit after dipping below $100. Get back to $100+ to earn again tomorrow.",
};

const stats: MoneyAccountSweepstakesStatsMeDto = {
  entryCount: 3,
  currentBalanceUsd: 1250.5,
  yieldEarnedUsd: 12.34,
  qualifyingDepositsUsd: 1000,
  qualifyingThresholdUsd: 100,
  todayStatus: 'on_track',
  daysRemaining: 4,
};

describe('MoneyAccountSweepstakesStatsSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders eligible balance and entries values from stats', () => {
    const { getByTestId, getByText } = render(
      <MoneyAccountSweepstakesStatsSummary
        stats={stats}
        localizedText={localizedText}
        isLoading={false}
      />,
    );

    expect(getByTestId(TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(getByText('Qualifying deposits')).toBeOnTheScreen();
    expect(getByText('Entries')).toBeOnTheScreen();
    // Shown against the threshold, not alone: the qualifying figure is net new
    // deposits and is normally lower than the account balance, so a bare number
    // is not legible on its own.
    expect(getByTestId(TEST_IDS.ELIGIBLE_BALANCE).props.children).toBe(
      '$1000.00',
    );
    expect(getByTestId(TEST_IDS.ENTRIES).props.children).toBe('3 / 7');
  });

  it('renders eligible balance before entries', () => {
    const { getAllByText } = render(
      <MoneyAccountSweepstakesStatsSummary
        stats={stats}
        localizedText={localizedText}
        isLoading={false}
      />,
    );

    const labels = getAllByText(/^(Qualifying deposits|Entries)$/);

    expect(labels.map(({ props }) => props.children)).toEqual([
      'Qualifying deposits',
      'Entries',
    ]);
  });

  it('shows Check icon when todayStatus is on_track', () => {
    const { getByTestId } = render(
      <MoneyAccountSweepstakesStatsSummary
        stats={stats}
        localizedText={localizedText}
        isLoading={false}
      />,
    );

    expect(
      getByTestId(TEST_IDS.ELIGIBLE_STATUS_ICON).props.accessibilityLabel,
    ).toBe('Check');
  });

  it('shows Danger icon only when todayStatus is lost_today', () => {
    const { getByTestId } = render(
      <MoneyAccountSweepstakesStatsSummary
        stats={{ ...stats, todayStatus: 'lost_today' }}
        localizedText={localizedText}
        isLoading={false}
      />,
    );

    expect(
      getByTestId(TEST_IDS.ELIGIBLE_STATUS_ICON).props.accessibilityLabel,
    ).toBe('Danger');
  });

  it('does not warn when todayStatus is not_yet_qualified, which is still winnable', () => {
    // The previous single below_threshold status forced these two to look
    // identical; only lost_today is unrecoverable, so only it warns.
    const { getByTestId } = render(
      <MoneyAccountSweepstakesStatsSummary
        stats={{ ...stats, todayStatus: 'not_yet_qualified' }}
        localizedText={localizedText}
        isLoading={false}
      />,
    );

    expect(
      getByTestId(TEST_IDS.ELIGIBLE_STATUS_ICON).props.accessibilityLabel,
    ).not.toBe('Danger');
  });

  it('renders dashes when stats are unavailable', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyAccountSweepstakesStatsSummary
        stats={null}
        localizedText={localizedText}
        isLoading={false}
      />,
    );

    expect(getByTestId(TEST_IDS.ELIGIBLE_BALANCE).props.children).toBe('—');
    expect(getByTestId(TEST_IDS.ENTRIES).props.children).toBe('—');
    expect(queryByTestId(TEST_IDS.ELIGIBLE_STATUS_ICON)).toBeNull();
  });

  it('hides values while loading without existing stats', () => {
    const { queryByTestId } = render(
      <MoneyAccountSweepstakesStatsSummary
        stats={null}
        localizedText={localizedText}
        isLoading
      />,
    );

    expect(queryByTestId(TEST_IDS.ELIGIBLE_BALANCE)).toBeNull();
    expect(queryByTestId(TEST_IDS.ENTRIES)).toBeNull();
  });

  it('keeps stale values visible while loading with existing stats', () => {
    const { getByTestId } = render(
      <MoneyAccountSweepstakesStatsSummary
        stats={stats}
        localizedText={localizedText}
        isLoading
      />,
    );

    expect(getByTestId(TEST_IDS.ENTRIES).props.children).toBe('3 / 7');
    // Shown against the threshold, not alone: the qualifying figure is net new
    // deposits and is normally lower than the account balance, so a bare number
    // is not legible on its own.
    expect(getByTestId(TEST_IDS.ELIGIBLE_BALANCE).props.children).toBe(
      '$1000.00',
    );
  });

  it('opens RewardsInfoSheetModal for entries', () => {
    const { getAllByTestId } = render(
      <MoneyAccountSweepstakesStatsSummary
        stats={stats}
        localizedText={localizedText}
        isLoading={false}
      />,
    );

    fireEvent.press(getAllByTestId('stats-info-button')[1]);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.REWARDS_INFO_SHEET_MODAL,
      {
        title: 'Entries',
        description:
          'One entry for each UTC day your qualifying deposits stayed at $100 or above. Max 7 per week.',
      },
    );
  });

  it('opens eligible balance info with on_track status description', () => {
    const { getAllByTestId } = render(
      <MoneyAccountSweepstakesStatsSummary
        stats={stats}
        localizedText={localizedText}
        isLoading={false}
      />,
    );

    fireEvent.press(getAllByTestId('stats-info-button')[0]);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.REWARDS_INFO_SHEET_MODAL,
      {
        title: 'Qualifying deposits',
        description:
          "Net new deposits in your Money Account since you joined. Reach $100 and don't drop below it before midnight UTC to earn today's entry. Balance from before joining doesn't count. You are on track to earn today's entry.",
      },
    );
  });

  it('opens eligible balance info with the not_yet_qualified description', () => {
    const { getAllByTestId } = render(
      <MoneyAccountSweepstakesStatsSummary
        stats={{ ...stats, todayStatus: 'not_yet_qualified' }}
        localizedText={localizedText}
        isLoading={false}
      />,
    );

    fireEvent.press(getAllByTestId('stats-info-button')[0]);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.REWARDS_INFO_SHEET_MODAL,
      {
        title: 'Qualifying deposits',
        description:
          "Net new deposits in your Money Account since you joined. Reach $100 and don't drop below it before midnight UTC to earn today's entry. Balance from before joining doesn't count. Deposit the shortfall to reach $100 and hold through midnight UTC for today's entry.",
      },
    );
  });
});
