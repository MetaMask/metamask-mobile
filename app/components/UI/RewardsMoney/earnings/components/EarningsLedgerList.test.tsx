import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import type { LedgerEntryDto } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { REWARDS_MONEY_TEST_IDS } from '../../constants';
import EarningsLedgerList from './EarningsLedgerList';

const createEntry = (id: string): LedgerEntryDto => ({
  id,
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
});

const defaultProps = {
  entries: [createEntry('entry-1')],
  isLoading: false,
  isLoadingMore: false,
  isRefreshing: false,
  hasMore: false,
  error: null,
  loadMore: jest.fn(),
  refresh: jest.fn(),
  retry: jest.fn(),
};

describe('EarningsLedgerList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a row per ledger entry', () => {
    render(
      <EarningsLedgerList
        {...defaultProps}
        entries={[createEntry('entry-1'), createEntry('entry-2')]}
      />,
    );

    expect(screen.getByTestId('rewards-money-ledger-row-0')).toBeOnTheScreen();
    expect(screen.getByTestId('rewards-money-ledger-row-1')).toBeOnTheScreen();
  });

  it('renders skeletons rather than empty copy while the first page loads', () => {
    render(<EarningsLedgerList {...defaultProps} entries={null} isLoading />);

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.LEDGER_SKELETON),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(REWARDS_MONEY_TEST_IDS.LEDGER_EMPTY),
    ).not.toBeOnTheScreen();
  });

  it('renders the empty copy only once the list has settled', () => {
    render(<EarningsLedgerList {...defaultProps} entries={[]} />);

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.LEDGER_EMPTY),
    ).toBeOnTheScreen();
  });

  it('renders an error banner when the first page fails with no rows', () => {
    render(
      <EarningsLedgerList
        {...defaultProps}
        entries={[]}
        error="Ledger unavailable"
      />,
    );

    expect(
      screen.getByText(strings('rewards_money.ledger.error_title')),
    ).toBeOnTheScreen();
  });

  it('retries the first page when the error banner CTA is pressed', () => {
    const retry = jest.fn();
    render(
      <EarningsLedgerList
        {...defaultProps}
        entries={[]}
        error="Ledger unavailable"
        retry={retry}
      />,
    );

    fireEvent.press(screen.getByText(strings('rewards_money.ledger.retry')));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('loads the next page when the list end is reached and more remain', () => {
    const loadMore = jest.fn();
    render(
      <EarningsLedgerList {...defaultProps} hasMore loadMore={loadMore} />,
    );

    fireEvent(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.LEDGER_LIST),
      'onEndReached',
    );

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('does not load more while a refresh is already in flight', () => {
    const loadMore = jest.fn();
    render(
      <EarningsLedgerList
        {...defaultProps}
        hasMore
        isRefreshing
        loadMore={loadMore}
      />,
    );

    fireEvent(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.LEDGER_LIST),
      'onEndReached',
    );

    expect(loadMore).not.toHaveBeenCalled();
  });
});
