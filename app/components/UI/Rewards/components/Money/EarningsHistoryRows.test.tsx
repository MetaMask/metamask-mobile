import React from 'react';
import { Text, TextColor } from '@metamask/design-system-react-native';
import type {
  LedgerClaimEntryDto,
  LedgerEarningEntryDto,
  ReferralLocalizedText,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  formatRewardsRelativeDay,
  formatRewardsRelativeTime,
} from '../../utils/formatUtils';
import { EarningsHistoryRow } from './EarningsHistoryRows';
import { EARNINGS_HISTORY_TEST_IDS } from './EarningsHistoryRows.testIds';

const LOCALIZED_TEXT = {
  historyReferrals: 'Referrals',
  historyCommission: 'Commission',
  historyRebate: 'Rebate',
  historyClaimed: 'Claimed',
  historyClaimPending: 'Pending',
  voided: 'Voided',
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
  claimable_at: '2026-09-02T00:00:00.000Z',
  swaps_source: null,
  perps_source: null,
  predict_source: null,
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
  payout_method: 'VOUCHER',
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

  it('shows a partially voided day as the net credit in green', () => {
    const { getByText, queryByText, UNSAFE_getAllByType } = renderWithProvider(
      <EarningsHistoryRow
        item={{
          ...earning,
          musd_amount: '10000000',
          voided_musd_amount: '2000000',
        }}
        localizedText={LOCALIZED_TEXT}
      />,
    );

    expect(getByText('+$8.00')).toBeOnTheScreen();
    expect(amountColor(UNSAFE_getAllByType, '+$8.00')).toBe(
      TextColor.SuccessDefault,
    );
    expect(queryByText('Voided')).toBeNull();
    expect(queryByText('+$10.00')).toBeNull();
  });

  it('shows a fully voided earning as the original amount in gray, marked voided', () => {
    const { getByText, queryByText, UNSAFE_getAllByType } = renderWithProvider(
      <EarningsHistoryRow
        item={{ ...earning, voided_musd_amount: '2500000' }}
        localizedText={LOCALIZED_TEXT}
      />,
    );

    expect(getByText('+$2.50')).toBeOnTheScreen();
    expect(amountColor(UNSAFE_getAllByType, '+$2.50')).toBe(
      TextColor.TextAlternative,
    );
    expect(getByText(formatRewardsRelativeDay('2026-09-01'))).toBeOnTheScreen();
    expect(getByText('Voided')).toBeOnTheScreen();
    expect(queryByText('$0.00')).toBeNull();
  });

  it('shows a settled claim as a debit', () => {
    const { getByText } = renderWithProvider(
      <EarningsHistoryRow item={claim} localizedText={LOCALIZED_TEXT} />,
    );

    expect(getByText('Claimed')).toBeOnTheScreen();
    expect(getByText('-$2.50')).toBeOnTheScreen();
  });

  it('shows an in-flight claim as pending', () => {
    const { getByText } = renderWithProvider(
      <EarningsHistoryRow
        item={{
          kind: 'pending-claim',
          id: 'claim-open',
          net_amount: '2500000',
        }}
        localizedText={LOCALIZED_TEXT}
      />,
    );

    expect(getByText('Claimed')).toBeOnTheScreen();
    expect(getByText('Pending')).toBeOnTheScreen();
    expect(getByText('-$2.50')).toBeOnTheScreen();
  });

  describe('when the clock is 19:47 UTC', () => {
    const now = new Date('2026-09-01T19:47:00.000Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it.each(['SOCIAL_FOLLOW_TRADE', 'REFERRAL_REV_SHARE'] as const)(
      'labels a %s day as today when its timestamp is that UTC midnight',
      (origin) => {
        const { getByText, queryByText } = renderWithProvider(
          <EarningsHistoryRow
            item={{ ...earning, earning_origin_type: origin }}
            localizedText={LOCALIZED_TEXT}
          />,
        );

        expect(getByText('Today')).toBeOnTheScreen();
        expect(queryByText('19h ago')).toBeNull();
      },
    );

    it.each(['SWAPS_FEE_CASHBACK', 'PERPS_FEE_CASHBACK'] as const)(
      'labels a %s trade by the hours since it',
      (origin) => {
        const { getByText, queryByText } = renderWithProvider(
          <EarningsHistoryRow
            item={{
              ...earning,
              earning_origin_type: origin,
              ledger_timestamp: '2026-09-01T12:00:00.000Z',
            }}
            localizedText={LOCALIZED_TEXT}
          />,
        );

        expect(
          getByText(
            formatRewardsRelativeTime(new Date('2026-09-01T12:00:00.000Z')),
          ),
        ).toBeOnTheScreen();
        expect(queryByText('Today')).toBeNull();
      },
    );

    it('labels a settled claim by the hours since it was created', () => {
      const { getByText, queryByText } = renderWithProvider(
        <EarningsHistoryRow
          item={{ ...claim, ledger_timestamp: '2026-09-01T17:47:00.000Z' }}
          localizedText={LOCALIZED_TEXT}
        />,
      );

      expect(
        getByText(
          formatRewardsRelativeTime(new Date('2026-09-01T17:47:00.000Z')),
        ),
      ).toBeOnTheScreen();
      expect(queryByText('Today')).toBeNull();
    });
  });
});
