import React from 'react';
import type {
  LedgerClaimEntryDto,
  LedgerEarningEntryDto,
  ReferralLocalizedText,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { EarningsHistoryRow } from './EarningsHistoryRows';

const LOCALIZED_TEXT = {
  historyReferrals: 'Referrals',
  historyCommission: 'Commission',
  historyRebate: 'Rebate',
  historyClaimed: 'Claimed',
} as unknown as ReferralLocalizedText;

const earning: LedgerEarningEntryDto = {
  type: 'earning',
  id: 'earn-1',
  earning_origin_type: 'SOCIAL_FOLLOW_TRADE',
  musd_amount: '2500000',
  fee_amount_usd: '1',
  entry_count: 1,
  transaction_hash: null,
  chain_id: null,
  ledger_timestamp: '2026-09-01T00:00:00.000Z',
  claim_status: 'unclaimed',
  claim_expires_at: null,
  swaps_source: null,
  perps_source: null,
};

const claim: LedgerClaimEntryDto = {
  type: 'claim',
  id: 'claim-1',
  route: 'REFERRAL_REV_SHARE',
  gross_amount: '2500000',
  net_amount: '2500000',
  withholding_rate_bps: 0,
  status: 'SETTLED',
  ledger_timestamp: '2026-09-02T00:00:00.000Z',
  settled_at: '2026-09-02T00:00:00.000Z',
};

describe('EarningsHistoryRow', () => {
  it('shows an earning as a signed credit', () => {
    const { getByText } = renderWithProvider(
      <EarningsHistoryRow item={earning} localizedText={LOCALIZED_TEXT} />,
    );

    expect(getByText('Commission')).toBeOnTheScreen();
    expect(getByText('+$2.50')).toBeOnTheScreen();
  });

  it('shows a settled claim as a debit', () => {
    const { getByText } = renderWithProvider(
      <EarningsHistoryRow item={claim} localizedText={LOCALIZED_TEXT} />,
    );

    expect(getByText('Claimed')).toBeOnTheScreen();
    expect(getByText('-$2.50')).toBeOnTheScreen();
  });
});
