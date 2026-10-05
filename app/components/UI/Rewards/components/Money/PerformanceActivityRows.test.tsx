import React from 'react';
import { Text, TextColor } from '@metamask/design-system-react-native';
import { fireEvent } from '@testing-library/react-native';
import type {
  CommissionEntryView,
  LedgerEarningEntryDto,
  ReferralLocalizedText,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  formatRewardsRelativeDay,
  formatRewardsRelativeTime,
} from '../../utils/formatUtils';
import {
  PERFORMANCE_ACTIVITY_TEST_IDS,
  PerformanceCommissionRow,
  PerformanceRebateRow,
} from './PerformanceActivityRows';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
    }),
  };
});

const LOCALIZED_TEXT = {
  copiedOnce: 'Copied 1 time',
  copiedTimes: 'Copied {count} times',
  rebatePerpsVolume: 'Perps volume',
  rebateSwaps: 'Swaps',
  paused: 'Paused',
  rewardPausedTitle: 'Reward paused',
  rewardPausedDescription: 'This reward is paused while we review it.',
} as unknown as ReferralLocalizedText;

const amountColor = (
  getAllByType: (
    type: typeof Text,
  ) => { props: { children?: unknown; color?: TextColor } }[],
  label: string,
) =>
  getAllByType(Text).find((node) => node.props.children === label)?.props.color;

const rebate = (
  overrides: Partial<LedgerEarningEntryDto> = {},
): LedgerEarningEntryDto => ({
  type: 'earning',
  id: 'e1',
  earning_origin_type: 'PERPS_FEE_CASHBACK',
  musd_amount: '1000000',
  voided_musd_amount: '0',
  fee_amount_usd: '1',
  entry_count: 1,
  transaction_hash: null,
  chain_id: null,
  ledger_timestamp: '2026-09-01T12:00:00.000Z',
  claim_status: 'unclaimed',
  claimable_at: '2026-09-02T00:00:00.000Z',
  swaps_source: null,
  perps_source: { coin: 'BTC', trade_id: 't1', tx_hash: null },
  predict_source: null,
  ...overrides,
});

describe('PerformanceActivityRows', () => {
  it('interpolates copied times from localized_text when more than one referee', () => {
    const item: CommissionEntryView = {
      id: 'c1',
      earning_origin_type: 'SOCIAL_FOLLOW_TRADE',
      day: '2026-09-01',
      token: { key: 'perps:BTC', symbol: 'BTC', source: 'PERPS' },
      musd_amount: '2500000',
      fee_amount_usd: '10',
      fill_count: 3,
      copied_times: 4,
    };

    const { getByText } = renderWithProvider(
      <PerformanceCommissionRow item={item} localizedText={LOCALIZED_TEXT} />,
    );

    expect(getByText('+$2.50')).toBeOnTheScreen();
    expect(getByText('Copied 4 times')).toBeOnTheScreen();
    expect(getByText('BTC')).toBeOnTheScreen();
    expect(getByText(formatRewardsRelativeDay('2026-09-01'))).toBeOnTheScreen();
  });

  it('uses copied once when the count is suppressed', () => {
    const item: CommissionEntryView = {
      id: 'c2',
      earning_origin_type: 'SOCIAL_FOLLOW_TRADE',
      day: '2026-09-01',
      token: { key: 'swaps:eth', symbol: null, source: 'SWAPS' },
      musd_amount: '1000000',
      fee_amount_usd: '1.00',
      fill_count: null,
      copied_times: null,
    };

    const { getByText } = renderWithProvider(
      <PerformanceCommissionRow item={item} localizedText={LOCALIZED_TEXT} />,
    );

    expect(getByText('+$1.00')).toBeOnTheScreen();
    expect(getByText('Copied 1 time')).toBeOnTheScreen();
    expect(getByText('swaps:eth')).toBeOnTheScreen();
  });

  it('labels a perps cashback row from localized_text, not Predictions', () => {
    const { getByText, queryByText, UNSAFE_getAllByType } = renderWithProvider(
      <PerformanceRebateRow item={rebate()} localizedText={LOCALIZED_TEXT} />,
    );

    expect(getByText('+$1.00')).toBeOnTheScreen();
    expect(amountColor(UNSAFE_getAllByType, '+$1.00')).toBe(
      TextColor.SuccessDefault,
    );
    expect(getByText('Perps volume')).toBeOnTheScreen();
    expect(
      getByText(
        formatRewardsRelativeTime(new Date('2026-09-01T12:00:00.000Z')),
      ),
    ).toBeOnTheScreen();
    expect(queryByText('Predictions')).toBeNull();
    expect(queryByText('Paused')).toBeNull();
  });

  it('shows a Paused badge for a rebate under review and opens the sheet', () => {
    const item = rebate({
      id: 'e2',
      earning_origin_type: 'SWAPS_FEE_CASHBACK',
      musd_amount: '40000000',
      ledger_timestamp: '2026-09-02T12:00:00.000Z',
      perps_source: null,
      blocking_reason: 'UNDER_REVIEW',
    });

    const { getByTestId, getByText } = renderWithProvider(
      <PerformanceRebateRow item={item} localizedText={LOCALIZED_TEXT} />,
    );

    expect(getByText('Swaps')).toBeOnTheScreen();
    expect(getByText('Paused')).toBeOnTheScreen();
    expect(
      getByTestId(PERFORMANCE_ACTIVITY_TEST_IDS.PAUSED_TAG),
    ).toBeOnTheScreen();
    fireEvent.press(getByTestId(PERFORMANCE_ACTIVITY_TEST_IDS.PAUSED_ROW));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.REWARDS_INFO_SHEET_MODAL,
      {
        title: 'Reward paused',
        description: 'This reward is paused while we review it.',
      },
    );
  });

  it('shows the remaining rebate in green when only part is voided', () => {
    const { getByText, queryByText, UNSAFE_getAllByType } = renderWithProvider(
      <PerformanceRebateRow
        item={rebate({ musd_amount: '2500000', voided_musd_amount: '1000000' })}
        localizedText={LOCALIZED_TEXT}
      />,
    );

    expect(getByText('+$1.50')).toBeOnTheScreen();
    expect(amountColor(UNSAFE_getAllByType, '+$1.50')).toBe(
      TextColor.SuccessDefault,
    );
    expect(queryByText('+$2.50')).toBeNull();
  });

  it('does not show a fully voided rebate as a green credit', () => {
    const { getByText, queryByText, UNSAFE_getAllByType } = renderWithProvider(
      <PerformanceRebateRow
        item={rebate({ musd_amount: '2500000', voided_musd_amount: '2500000' })}
        localizedText={LOCALIZED_TEXT}
      />,
    );

    expect(getByText('$0.00')).toBeOnTheScreen();
    expect(amountColor(UNSAFE_getAllByType, '$0.00')).toBe(
      TextColor.TextAlternative,
    );
    expect(queryByText('+$2.50')).toBeNull();
  });
});
