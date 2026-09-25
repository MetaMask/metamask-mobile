import React from 'react';
import type {
  CommissionEntryView,
  LedgerEarningEntryDto,
  ReferralLocalizedText,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  formatRewardsRelativeDay,
  formatRewardsRelativeTime,
} from '../../utils/formatUtils';
import {
  PerformanceCommissionRow,
  PerformanceRebateRow,
} from './PerformanceActivityRows';

const LOCALIZED_TEXT = {
  copiedOnce: 'Copied 1 time',
  copiedTimes: 'Copied {count} times',
  rebatePerpsVolume: 'Perps volume',
  rebateSwaps: 'Swaps',
} as unknown as ReferralLocalizedText;

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

    expect(getByText('Copied 1 time')).toBeOnTheScreen();
    expect(getByText('swaps:eth')).toBeOnTheScreen();
  });

  it('labels a perps cashback row from localized_text, not Predictions', () => {
    const item: LedgerEarningEntryDto = {
      type: 'earning',
      id: 'e1',
      earning_origin_type: 'PERPS_FEE_CASHBACK',
      musd_amount: '1000000',
      fee_amount_usd: '1',
      entry_count: 1,
      transaction_hash: null,
      chain_id: null,
      ledger_timestamp: '2026-09-01T12:00:00.000Z',
      claim_status: 'unclaimed',
      claim_expires_at: null,
      swaps_source: null,
      perps_source: { coin: 'BTC', trade_id: 't1', tx_hash: null },
    };

    const { getByText, queryByText } = renderWithProvider(
      <PerformanceRebateRow item={item} localizedText={LOCALIZED_TEXT} />,
    );

    expect(getByText('Perps volume')).toBeOnTheScreen();
    expect(
      getByText(
        formatRewardsRelativeTime(new Date('2026-09-01T12:00:00.000Z')),
      ),
    ).toBeOnTheScreen();
    expect(queryByText('Predictions')).toBeNull();
  });
});
