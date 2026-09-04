import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import type { LedgerEntryDto } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import EarningsLedgerRow, { describeLedgerEntry } from './EarningsLedgerRow';

const createEntry = (
  overrides: Partial<LedgerEntryDto> = {},
): LedgerEntryDto => ({
  id: 'entry-1',
  earning_origin_type: 'CASHBACK',
  musd_amount: '1250000',
  fee_amount_usd: '2.50',
  entry_count: 1,
  transaction_hash: null,
  chain_id: null,
  ledger_timestamp: '2026-09-01T00:00:00.000Z',
  claim_status: 'UNCLAIMED',
  claim_expires_at: null,
  swaps_source: null,
  perps_source: null,
  ...overrides,
});

describe('describeLedgerEntry', () => {
  it('names both assets for a swap with a known pair', () => {
    const entry = createEntry({
      swaps_source: {
        quote_id: 'q1',
        src_asset_symbol: 'ETH',
        dest_asset_symbol: 'USDC',
        src_tx_hash: null,
        dest_tx_hash: null,
      },
    });

    const result = describeLedgerEntry(entry);

    expect(result).toBe(
      strings('rewards_money.ledger.swap_pair', { from: 'ETH', to: 'USDC' }),
    );
  });

  it('falls back to a plain swap label when an asset symbol is missing', () => {
    const entry = createEntry({
      swaps_source: {
        quote_id: 'q1',
        src_asset_symbol: null,
        dest_asset_symbol: 'USDC',
        src_tx_hash: null,
        dest_tx_hash: null,
      },
    });

    const result = describeLedgerEntry(entry);

    expect(result).toBe(strings('rewards_money.ledger.swap'));
  });

  it('names the coin for a perps entry', () => {
    const entry = createEntry({
      perps_source: { coin: 'BTC', trade_id: 't1', tx_hash: null },
    });

    const result = describeLedgerEntry(entry);

    expect(result).toBe(strings('rewards_money.ledger.perps', { coin: 'BTC' }));
  });

  it('reports the trade count for a multi-trade aggregate', () => {
    const entry = createEntry({
      earning_origin_type: 'REFERRAL_REV_SHARE',
      entry_count: 143,
    });

    const result = describeLedgerEntry(entry);

    expect(result).toBe(
      strings('rewards_money.ledger.aggregate', { count: '143' }),
    );
  });

  it('reports a single-entry aggregate without a count', () => {
    const entry = createEntry({
      earning_origin_type: 'REFERRAL_REV_SHARE',
      entry_count: 1,
    });

    const result = describeLedgerEntry(entry);

    expect(result).toBe(strings('rewards_money.ledger.aggregate_single'));
  });
});

describe('EarningsLedgerRow', () => {
  it('renders the origin-type label and the amount', () => {
    render(<EarningsLedgerRow entry={createEntry()} testID="row-0" />);

    expect(
      screen.getByText(strings('rewards_money.origin_type.cashback')),
    ).toBeOnTheScreen();
    expect(screen.getByText('1.25')).toBeOnTheScreen();
  });

  it('labels a rev-share entry as referral earnings', () => {
    render(
      <EarningsLedgerRow
        entry={createEntry({ earning_origin_type: 'REFERRAL_REV_SHARE' })}
        testID="row-0"
      />,
    );

    expect(
      screen.getByText(strings('rewards_money.origin_type.referral_rev_share')),
    ).toBeOnTheScreen();
  });
});
