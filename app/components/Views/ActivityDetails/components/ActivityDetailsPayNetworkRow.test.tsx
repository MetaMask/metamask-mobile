import React from 'react';
import type { TransactionMeta } from '@metamask/transaction-controller';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
import { ActivityDetailsPayNetworkRow } from './ActivityDetailsPayNetworkRow';

/**
 * A provider-backed funds row. `chainId` is the settlement chain the Activity
 * list injects for HyperLiquid (Arbitrum), not a chain the user chose.
 */
function payItem(overrides: Partial<ActivityListItem> = {}): ActivityListItem {
  return {
    type: 'perpsWithdraw',
    chainId: 'eip155:42161',
    status: 'success',
    timestamp: 1_765_361_640_000,
    hash: '0xperpsfunds',
    raw: { type: 'perpsTransaction', data: { id: 'perps-1' } },
    data: { token: { amount: '1', symbol: 'USDC', direction: 'out' } },
    ...overrides,
  } as unknown as ActivityListItem;
}

/** A row whose own local transaction carries the Pay metadata. */
function localPayItem(payChainId: string): ActivityListItem {
  return payItem({
    raw: {
      type: 'localTransaction',
      data: {
        primaryTransaction: {
          id: 'perps-withdraw-tx',
          chainId: '0xa4b1',
          metamaskPay: { chainId: payChainId },
        },
        initialTransaction: { id: 'perps-withdraw-tx', chainId: '0xa4b1' },
        transactions: [],
      },
    },
  } as unknown as Partial<ActivityListItem>);
}

/**
 * Real network configurations, so chain ids resolve to names rather than falling
 * back to the raw id. `transactions` optionally supplies the local transaction a
 * provider-backed row is matched to by hash.
 */
function stateWithNetworks(transactions: TransactionMeta[] = []) {
  return {
    engine: {
      backgroundState: {
        ...backgroundState,
        TransactionController: {
          ...backgroundState.TransactionController,
          transactions,
        },
      },
    },
  };
}

function payTransaction(hash: string, payChainId: string): TransactionMeta {
  return {
    id: 'perps-withdraw-tx',
    chainId: '0xa4b1',
    hash,
    metamaskPay: { chainId: payChainId },
  } as unknown as TransactionMeta;
}

describe('ActivityDetailsPayNetworkRow', () => {
  it('renders no row at all for a deposit', () => {
    // Pay can source a deposit from any combination of chains, so the redesign
    // omits the row rather than naming one.
    const { queryByTestId, queryByText } = renderWithProvider(
      <ActivityDetailsPayNetworkRow item={localPayItem('0x1')} isDeposit />,
      { state: stateWithNetworks() },
    );

    expect(queryByTestId(ActivityDetailsSelectorsIDs.NETWORK_ROW)).toBeNull();
    expect(queryByText('Network')).toBeNull();
  });

  it('names the payment chain from the local transaction, not the row chain', () => {
    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <ActivityDetailsPayNetworkRow
        item={localPayItem('0x1')}
        isDeposit={false}
      />,
      { state: stateWithNetworks() },
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.NETWORK_ROW),
    ).toBeOnTheScreen();
    expect(getByText('Ethereum')).toBeOnTheScreen();
    expect(queryByText('Arbitrum')).toBeNull();
  });

  it('resolves the payment chain by hash for a provider-backed row', () => {
    // The feed row carries no `metamaskPay`; only its hash ties it to the local
    // transaction that does.
    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <ActivityDetailsPayNetworkRow item={payItem()} isDeposit={false} />,
      {
        state: stateWithNetworks([payTransaction('0xperpsfunds', '0x2105')]),
      },
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.NETWORK_ROW),
    ).toBeOnTheScreen();
    expect(getByText('Base')).toBeOnTheScreen();
    expect(queryByText('Arbitrum')).toBeNull();
  });

  it("falls back to the row's own chain when Pay did not route it", () => {
    const { getByTestId, getByText } = renderWithProvider(
      <ActivityDetailsPayNetworkRow item={payItem()} isDeposit={false} />,
      { state: stateWithNetworks() },
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.NETWORK_ROW),
    ).toBeOnTheScreen();
    expect(getByText('Arbitrum')).toBeOnTheScreen();
  });
});
