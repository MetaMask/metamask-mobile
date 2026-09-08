import React from 'react';
import { render, screen } from '@testing-library/react-native';
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
