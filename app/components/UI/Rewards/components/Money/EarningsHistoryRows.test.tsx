import React from 'react';
import { Text, TextColor } from '@metamask/design-system-react-native';
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

const amountColor = (
  getAllByType: (
    type: typeof Text,
  ) => { props: { children?: unknown; color?: TextColor } }[],
  label: string,
) =>
  getAllByType(Text).find((node) => node.props.children === label)?.props.color;

const earning: LedgerEarningEntryDto = {
  type: 'earning',
  id: 'earn-1',
  earning_origin_type: 'SOCIAL_FOLLOW_TRADE',
  musd_amount: '2500000',
  voided_musd_amount: '0',
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
    const { getByText, UNSAFE_getAllByType } = renderWithProvider(
      <EarningsHistoryRow item={earning} localizedText={LOCALIZED_TEXT} />,
    );

    expect(getByText('Commission')).toBeOnTheScreen();
    expect(getByText('+$2.50')).toBeOnTheScreen();
    expect(amountColor(UNSAFE_getAllByType, '+$2.50')).toBe(
      TextColor.SuccessDefault,
    );
  });

  it('shows the remaining earning in green when only part is voided', () => {
    const { getByText, queryByText, UNSAFE_getAllByType } = renderWithProvider(
      <EarningsHistoryRow
        item={{ ...earning, voided_musd_amount: '1000000' }}
        localizedText={LOCALIZED_TEXT}
      />,
    );

    expect(getByText('+$1.50')).toBeOnTheScreen();
    expect(amountColor(UNSAFE_getAllByType, '+$1.50')).toBe(
      TextColor.SuccessDefault,
    );
    expect(queryByText('+$2.50')).toBeNull();
  });

  it('does not show a fully voided earning as a green credit', () => {
    const { getByText, queryByText, UNSAFE_getAllByType } = renderWithProvider(
      <EarningsHistoryRow
        item={{ ...earning, voided_musd_amount: '2500000' }}
        localizedText={LOCALIZED_TEXT}
      />,
    );

    expect(getByText('$0.00')).toBeOnTheScreen();
    expect(amountColor(UNSAFE_getAllByType, '$0.00')).toBe(
      TextColor.TextAlternative,
    );
    expect(queryByText('+$2.50')).toBeNull();
  });

  it('shows a settled claim as a debit', () => {
    const { getByText } = renderWithProvider(
      <EarningsHistoryRow item={claim} localizedText={LOCALIZED_TEXT} />,
    );

    expect(getByText('Claimed')).toBeOnTheScreen();
    expect(getByText('-$2.50')).toBeOnTheScreen();
  });
});
