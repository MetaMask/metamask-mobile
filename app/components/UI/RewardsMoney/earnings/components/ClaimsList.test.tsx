import React from 'react';
import { ActivityIndicator } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ClaimDto } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { REWARDS_MONEY_TEST_IDS } from '../../constants';
import ClaimsList, { type ClaimsListProps } from './ClaimsList';

const createClaim = (id: string): ClaimDto =>
  ({
    id,
    money_account_address: '0xmoneyaccount',
    earning_origin_types: ['REFERRAL_REV_SHARE'],
    gross_amount: '200000',
    withheld_amount: '0',
    net_amount: '200000',
    withholding_rate_bps: 0,
    valid_before: null,
    status: 'SETTLED',
    created_at: '2026-09-07T10:00:00.000Z',
    settled_tx_hash: '0xhash',
    settled_at: '2026-09-07T10:01:00.000Z',
  }) as ClaimDto;

const renderList = (overrides: Partial<ClaimsListProps> = {}) =>
  render(
    <ClaimsList
      claims={[]}
      isLoading={false}
      isLoadingMore={false}
      isRefreshing={false}
      hasMore={false}
      error={null}
      loadMore={jest.fn()}
      refresh={jest.fn()}
      retry={jest.fn()}
      resolveRowPress={() => null}
      {...overrides}
    />,
  );

describe('ClaimsList', () => {
  it('renders a row per claim', () => {
    renderList({ claims: [createClaim('a'), createClaim('b')] });

    expect(screen.getByTestId('rewards-money-claims-row-0')).toBeOnTheScreen();
    expect(screen.getByTestId('rewards-money-claims-row-1')).toBeOnTheScreen();
  });

  it('shows the settled empty copy once loading finishes with no claims', () => {
    renderList();

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.CLAIMS_EMPTY),
    ).toBeOnTheScreen();
  });

  /**
   * An in-flight first page must never show "no withdrawals yet" — the tri-state
   * empty renderer is what keeps a load from looking like an empty result.
   */
  it.each([
    ['isLoading', { isLoading: true }],
    ['a null list', { claims: null }],
  ])('shows skeletons rather than empty copy for %s', (_label, overrides) => {
    renderList(overrides as Partial<ClaimsListProps>);

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.CLAIMS_SKELETON),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(REWARDS_MONEY_TEST_IDS.CLAIMS_EMPTY),
    ).not.toBeOnTheScreen();
  });

  it('shows an error banner instead of the empty copy when the read failed', () => {
    renderList({ error: 'boom' });

    expect(
      screen.queryByTestId(REWARDS_MONEY_TEST_IDS.CLAIMS_EMPTY),
    ).not.toBeOnTheScreen();
    expect(screen.getByText("Couldn't load withdrawals")).toBeOnTheScreen();
  });

  describe('pagination', () => {
    const endReached = () =>
      fireEvent(
        screen.getByTestId(REWARDS_MONEY_TEST_IDS.CLAIMS_LIST),
        'endReached',
      );

    it('loads the next page when the list end is reached', () => {
      const loadMore = jest.fn();
      renderList({ claims: [createClaim('a')], hasMore: true, loadMore });

      endReached();

      expect(loadMore).toHaveBeenCalledTimes(1);
    });

    /**
     * Each guard exists to stop a second request racing the first, or firing
     * against a list that has nothing to page past yet.
     */
    it.each<[string, Partial<ClaimsListProps>]>([
      ['there is no next page', { hasMore: false }],
      ['the first page is still loading', { hasMore: true, isLoading: true }],
      ['a page is already in flight', { hasMore: true, isLoadingMore: true }],
      ['a refresh is in flight', { hasMore: true, isRefreshing: true }],
      ['the list is empty', { hasMore: true, claims: [] }],
      ['the list is null', { hasMore: true, claims: null }],
    ])('does not load more when %s', (_label, overrides) => {
      const loadMore = jest.fn();
      renderList({ claims: [createClaim('a')], loadMore, ...overrides });

      endReached();

      expect(loadMore).not.toHaveBeenCalled();
    });

    it('shows a footer spinner while a later page loads', () => {
      renderList({ claims: [createClaim('a')], isLoadingMore: true });

      // A composite, not a host element, so existence is the assertion —
      // UNSAFE_getByType throws when it is absent.
      expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    /** Nothing to append to yet — the empty renderer already owns that state. */
    it('shows no footer spinner when there are no rows', () => {
      renderList({ claims: [], isLoadingMore: true });

      expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
    });
  });

  /** The resolver decides tappability per row, so a null must stay inert. */
  it('renders rows inert when the resolver returns null', () => {
    renderList({ claims: [createClaim('a')], resolveRowPress: () => null });

    expect(
      screen.queryByTestId('rewards-money-claims-row-0-pressable'),
    ).not.toBeOnTheScreen();
  });

  it('renders a pressable row when the resolver supplies a target', () => {
    renderList({
      claims: [createClaim('a')],
      resolveRowPress: () => ({ onPress: jest.fn(), isInferredMatch: false }),
    });

    expect(
      screen.getByTestId('rewards-money-claims-row-0-pressable'),
    ).toBeOnTheScreen();
  });
});
