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

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'rewards.upcoming_rewards.cta_label': 'Got it',
    };
    return map[key] ?? key;
  },
}));

jest.mock('../../../utils/formatUtils', () => ({
  formatUsd: (value: number | null) =>
    value == null ? '—' : `$${value.toFixed(2)}`,
}));

const TEST_IDS = MONEY_ACCOUNT_SWEEPSTAKES_STATS_SUMMARY_TEST_IDS;

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
  weekTitle: 'Week {number}',
  completeLabel: 'Complete',
  activeLabel: 'Active',
  joinTheSweepstakesTitle: 'Join the Sweepstakes',
  drawPendingTitle: 'Draw pending',
  drawCompleteTitle: 'Winners drawn',
  drawProofTitle: 'Draw proof',
  merkleRootLabel: 'Merkle root',
  formulaLabel: 'Formula',
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
};

const stats: MoneyAccountSweepstakesStatsMeDto = {
  entryCount: 3,
  currentBalanceUsd: 1250.5,
  yieldEarnedUsd: 12.34,
  todayMinUsd: 1000,
  todayStatus: 'on_track',
  daysRemaining: 4,
};

describe('MoneyAccountSweepstakesStatsSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders balance and entries values from stats', () => {
    const { getByTestId, getByText } = render(
      <MoneyAccountSweepstakesStatsSummary
        stats={stats}
        localizedText={localizedText}
        isLoading={false}
      />,
    );

    expect(getByTestId(TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(getByText('Current balance')).toBeOnTheScreen();
    expect(getByText('Eligible balance')).toBeOnTheScreen();
    expect(getByText('Entries')).toBeOnTheScreen();
    expect(getByTestId(TEST_IDS.CURRENT_BALANCE).props.children).toBe(
      '$1250.50',
    );
    expect(getByTestId(TEST_IDS.ELIGIBLE_BALANCE).props.children).toBe(
      '$1000.00',
    );
    expect(getByTestId(TEST_IDS.ENTRIES).props.children).toBe('3 / 7');
  });

  it('renders dashes when stats are unavailable', () => {
    const { getByTestId } = render(
      <MoneyAccountSweepstakesStatsSummary
        stats={null}
        localizedText={localizedText}
        isLoading={false}
      />,
    );

    expect(getByTestId(TEST_IDS.CURRENT_BALANCE).props.children).toBe('—');
    expect(getByTestId(TEST_IDS.ELIGIBLE_BALANCE).props.children).toBe('—');
    expect(getByTestId(TEST_IDS.ENTRIES).props.children).toBe('—');
  });

  it('hides values while loading without existing stats', () => {
    const { queryByTestId } = render(
      <MoneyAccountSweepstakesStatsSummary
        stats={null}
        localizedText={localizedText}
        isLoading
      />,
    );

    expect(queryByTestId(TEST_IDS.CURRENT_BALANCE)).toBeNull();
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

    expect(getByTestId(TEST_IDS.CURRENT_BALANCE).props.children).toBe(
      '$1250.50',
    );
    expect(getByTestId(TEST_IDS.ENTRIES).props.children).toBe('3 / 7');
  });

  it('opens an info modal when a stats info button is pressed', () => {
    const { getAllByTestId } = render(
      <MoneyAccountSweepstakesStatsSummary
        stats={stats}
        localizedText={localizedText}
        isLoading={false}
      />,
    );

    fireEvent.press(getAllByTestId('stats-info-button')[0]);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      expect.objectContaining({
        title: 'Current balance',
        description: 'Current balance description',
        showCancelButton: true,
        cancelMode: 'top-right-cross-icon',
      }),
    );
  });
});
