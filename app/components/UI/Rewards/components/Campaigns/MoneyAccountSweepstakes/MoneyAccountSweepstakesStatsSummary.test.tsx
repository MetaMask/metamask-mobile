import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import MoneyAccountSweepstakesStatsSummary, {
  MONEY_ACCOUNT_SWEEPSTAKES_STATS_SUMMARY_TEST_IDS,
} from './MoneyAccountSweepstakesStatsSummary';
import type { MoneyAccountSweepstakesStatsMeDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../../../constants/navigation/Routes';
import { createMoneyAccountSweepstakesLocalizedText } from './testUtils';

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

const localizedText = createMoneyAccountSweepstakesLocalizedText();

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
      '$1000.00 / $100.00',
    );
    expect(getByTestId(TEST_IDS.ENTRIES).props.children).toBe('3 / 7');
    expect(getByTestId(TEST_IDS.CURRENT_BALANCE).props.children).toBe(
      '$1250.50',
    );
    expect(getByTestId(TEST_IDS.NEXT_DRAW).props.children).toBe('4 days');
    expect(getByTestId(TEST_IDS.QUALIFICATION_PROGRESS)).toBeOnTheScreen();
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
      '$1000.00 / $100.00',
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
          "Net new deposits in your Money Account since you joined. Reach $100 and don't drop below it before midnight UTC to earn today's entry. Balance from before joining doesn't count. You're on track for today's entry. Keep at least $100 in your Money Account through the end of the day.",
      },
    );
  });

  it('opens eligible balance info with the not_yet_qualified description', () => {
    const { getAllByTestId } = render(
      <MoneyAccountSweepstakesStatsSummary
        stats={{
          ...stats,
          todayStatus: 'not_yet_qualified',
          qualifyingDepositsUsd: 40,
        }}
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
          "Net new deposits in your Money Account since you joined. Reach $100 and don't drop below it before midnight UTC to earn today's entry. Balance from before joining doesn't count. Add $60.00 today to reach $100 and earn today's entry.",
      },
    );
  });
});
