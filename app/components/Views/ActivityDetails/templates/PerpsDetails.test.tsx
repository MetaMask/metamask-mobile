import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import {
  FillType,
  PerpsOrderTransactionStatus,
  PerpsOrderTransactionStatusType,
  type PerpsTransaction,
} from '../../../UI/Perps/types/transactionHistory';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
import { PerpsDetails } from './PerpsDetails';

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => {
    const actual = jest.requireActual(
      '../../../../selectors/multichainAccounts/accountTreeController',
    );
    return {
      ...actual,
      selectSelectedAccountGroupEvmInternalAccount: jest.fn(() => ({
        address: '0x0000000000000000000000000000000000000001',
        metadata: { name: 'Account 1' },
      })),
    };
  },
);

jest.mock('../../../UI/Perps/hooks', () => ({
  usePerpsBlockExplorerUrl: () => ({
    getExplorerUrl: () => 'https://app.hyperliquid.xyz/explorer/address/0x1',
  }),
  usePerpsOrderFees: () => ({
    totalFee: 2.345,
    protocolFee: 0.005,
    metamaskFee: 1.229,
  }),
}));

const baseTransaction: Pick<
  PerpsTransaction,
  'id' | 'category' | 'title' | 'subtitle' | 'timestamp' | 'asset'
> = {
  id: 'perps-1',
  category: 'position_open',
  title: 'Opened short',
  subtitle: '0.0001 BTC',
  timestamp: 1_765_361_640_000,
  asset: 'BTC',
};

function perpsItem(
  type: ActivityListItem['type'],
  transaction: PerpsTransaction,
  status: ActivityListItem['status'] = 'success',
): ActivityListItem {
  return {
    type,
    chainId: 'eip155:42161',
    status,
    timestamp: transaction.timestamp,
    hash: transaction.id,
    raw: { type: 'perpsTransaction', data: transaction },
    data: { token: { amount: '1', symbol: 'USD', direction: 'out' } },
  } as ActivityListItem;
}

const PAY_METADATA = {
  chainId: '0x1',
  networkFeeFiat: '1.23',
  bridgeFeeFiat: '0.09',
  totalFiat: '1001.24',
};

/** State where the deposit's local transaction carries MetaMask Pay fees. */
function stateWithPayTransaction(hash: string) {
  return {
    engine: {
      backgroundState: {
        ...backgroundState,
        TransactionController: {
          ...backgroundState.TransactionController,
          transactions: [
            {
              id: 'perps-deposit-tx',
              chainId: '0xa4b1',
              hash,
              metamaskPay: PAY_METADATA,
            },
          ],
        },
      },
    },
  };
}

/**
 * A deposit that only exists locally — the state the funding toast's "Track"
 * opens into, before the HyperLiquid feed returns the row.
 */
function localPerpsFundsItem(
  type: 'perpsAddFunds' | 'perpsWithdraw' = 'perpsAddFunds',
  status: ActivityListItem['status'] = 'success',
): ActivityListItem {
  return {
    type,
    chainId: 'eip155:42161',
    status,
    timestamp: 1_765_361_640_000,
    hash: '0xperpsdeposit',
    raw: {
      type: 'localTransaction',
      data: {
        primaryTransaction: {
          id: 'perps-deposit-tx',
          chainId: '0xa4b1',
          metamaskPay: PAY_METADATA,
        },
        initialTransaction: { id: 'perps-deposit-tx', chainId: '0xa4b1' },
        transactions: [],
      },
    },
    data: {
      token: {
        amount: '100000',
        decimals: 6,
        symbol: 'USDC',
        direction: type === 'perpsAddFunds' ? 'in' : 'out',
      },
    },
  } as unknown as ActivityListItem;
}

describe('PerpsDetails', () => {
  it('renders trade rows and trade-again CTA', () => {
    const transaction: PerpsTransaction = {
      ...baseTransaction,
      type: 'trade',
      fill: {
        shortTitle: 'Closed short',
        amount: '-$0.02',
        amountNumber: -0.02,
        isPositive: false,
        size: '0.0001',
        entryPrice: '92113',
        points: '0',
        pnl: '-$0.02',
        fee: '0.02',
        action: 'Closed',
        feeToken: 'USDC',
        fillType: FillType.Standard,
      },
    };

    const { getByText, getByTestId } = renderWithProvider(
      <PerpsDetails item={perpsItem('perpsCloseShort', transaction)} />,
    );

    expect(getByText('Size')).toBeOnTheScreen();
    expect(getByText('Close price')).toBeOnTheScreen();
    expect(getByText('Net P&L')).toBeOnTheScreen();
    expect(
      getByTestId(ActivityDetailsSelectorsIDs.DO_IT_AGAIN_BUTTON),
    ).toBeOnTheScreen();

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.STATUS_PILL),
    ).toHaveTextContent('Confirmed');
  });

  it('renders canceled order rows and try-again CTA', () => {
    const transaction: PerpsTransaction = {
      ...baseTransaction,
      id: 'order-1',
      type: 'order',
      category: 'limit_order',
      title: 'Take profit close short',
      order: {
        text: PerpsOrderTransactionStatus.Canceled,
        statusType: PerpsOrderTransactionStatusType.Canceled,
        type: 'limit',
        size: '10.23',
        limitPrice: '98023',
        filled: '0%',
      },
    };

    const { getByText, getByTestId } = renderWithProvider(
      <PerpsDetails
        item={perpsItem('marketCloseShort', transaction, 'cancelled')}
      />,
    );

    expect(getByText('Limit price')).toBeOnTheScreen();
    expect(getByText('MetaMask fee')).toBeOnTheScreen();
    expect(
      getByTestId(ActivityDetailsSelectorsIDs.DO_IT_AGAIN_BUTTON),
    ).toBeOnTheScreen();
  });

  it('renders funding rate and signed funding fee', () => {
    const transaction: PerpsTransaction = {
      ...baseTransaction,
      id: 'funding-1',
      type: 'funding',
      category: 'funding_fee',
      title: 'Received funding fee',
      fundingAmount: {
        isPositive: true,
        fee: '+$0.00000001',
        feeNumber: 0.00000001,
        rate: '-0.000000947%',
      },
    };

    const { getByText } = renderWithProvider(
      <PerpsDetails
        item={perpsItem('perpsReceivedFundingFees', transaction)}
      />,
    );

    expect(getByText('Rate')).toBeOnTheScreen();
    expect(getByText('Funding fee')).toBeOnTheScreen();
    expect(getByText('+$0.00000001')).toBeOnTheScreen();
  });

  it('formats perps fiat rows with the shared Perps formatter (universal ranges)', () => {
    const transaction: PerpsTransaction = {
      ...baseTransaction,
      id: 'order-2',
      type: 'order',
      category: 'limit_order',
      title: 'Market short',
      order: {
        text: PerpsOrderTransactionStatus.Filled,
        statusType: PerpsOrderTransactionStatusType.Filled,
        type: 'limit',
        size: '10.239',
        limitPrice: '98023.456',
        filled: '100%',
      },
    };

    const { getByText } = renderWithProvider(
      <PerpsDetails item={perpsItem('marketShort', transaction)} />,
    );

    expect(getByText('$10.239')).toBeOnTheScreen();
    expect(getByText('$98,023')).toBeOnTheScreen();
    expect(getByText('$1.229')).toBeOnTheScreen();
    expect(getByText('$2.345')).toBeOnTheScreen();
    expect(getByText('$0.005')).toBeOnTheScreen();
  });

  it('shows a filled order as "Filled" in the status row, not "Confirmed"', () => {
    const transaction: PerpsTransaction = {
      ...baseTransaction,
      id: 'order-filled',
      type: 'order',
      category: 'limit_order',
      title: 'Market short',
      order: {
        text: PerpsOrderTransactionStatus.Filled,
        statusType: PerpsOrderTransactionStatusType.Filled,
        type: 'market',
        size: '10',
        limitPrice: '90000',
        filled: '100%',
      },
    };

    const { getByTestId } = renderWithProvider(
      <PerpsDetails item={perpsItem('marketShort', transaction)} />,
    );

    const statusPill = getByTestId(ActivityDetailsSelectorsIDs.STATUS_PILL);
    expect(statusPill).toHaveTextContent('Filled');
    expect(statusPill).not.toHaveTextContent('Confirmed');
  });

  it('labels a rejected order "Rejected" in the status row (not "Failed")', () => {
    const transaction: PerpsTransaction = {
      ...baseTransaction,
      id: 'order-rejected',
      type: 'order',
      category: 'limit_order',
      title: 'Market short',
      order: {
        text: PerpsOrderTransactionStatus.Rejected,
        statusType: PerpsOrderTransactionStatusType.Canceled,
        type: 'market',
        size: '10',
        limitPrice: '90000',
        filled: '0%',
      },
    };

    const { getByTestId } = renderWithProvider(
      <PerpsDetails item={perpsItem('marketShort', transaction, 'failed')} />,
    );

    const statusPill = getByTestId(ActivityDetailsSelectorsIDs.STATUS_PILL);
    expect(statusPill).toHaveTextContent('Rejected');
    expect(statusPill).not.toHaveTextContent('Failed');
  });

  it('renders funds movement metadata and best-effort steps', () => {
    const transaction: PerpsTransaction = {
      ...baseTransaction,
      id: 'deposit-1',
      type: 'deposit',
      category: 'deposit',
      title: 'Account funded',
      asset: 'USDC',
      depositWithdrawal: {
        amount: '+$1,000',
        amountNumber: 1000,
        isPositive: true,
        asset: 'USDC',
        txHash: '0xdeposit',
        status: 'completed',
        type: 'deposit',
      },
    };

    const { getByText, queryByText } = renderWithProvider(
      <PerpsDetails item={perpsItem('perpsAddFunds', transaction)} />,
    );

    expect(getByText('Steps (4 completed)')).toBeOnTheScreen();
    expect(getByText('Approve funds')).toBeOnTheScreen();
    expect(getByText('Add funds')).toBeOnTheScreen();
    expect(getByText('Fund again')).toBeOnTheScreen();
    expect(queryByText('View on block explorer')).toBeNull();
  });

  describe('MetaMask Pay fees', () => {
    const fundsTransaction: PerpsTransaction = {
      ...baseTransaction,
      id: 'wallet-deposit-1',
      type: 'deposit',
      category: 'deposit',
      title: 'Account funded',
      asset: 'USDC',
      depositWithdrawal: {
        amount: '+$1,000',
        amountNumber: 1000,
        isPositive: true,
        asset: 'USDC',
        txHash: '0xperpsdeposit',
        status: 'completed',
        type: 'deposit',
      },
    };

    function feedItem(): ActivityListItem {
      return {
        ...perpsItem('perpsAddFunds', fundsTransaction),
        hash: '0xperpsdeposit',
      } as ActivityListItem;
    }

    it('shows the fee rows on a feed-backed deposit, resolved from its local transaction', () => {
      // The HyperLiquid row carries no `metamaskPay`; only its hash ties it to
      // the local transaction that does.
      const { getByText } = renderWithProvider(
        <PerpsDetails item={feedItem()} />,
        {
          state: stateWithPayTransaction('0xperpsdeposit'),
        },
      );

      expect(getByText('Transaction fee')).toBeOnTheScreen();
      expect(getByText('$1.23')).toBeOnTheScreen();
      expect(getByText('Bridge fee')).toBeOnTheScreen();
      expect(getByText('$0.09')).toBeOnTheScreen();
      expect(getByText('Total amount')).toBeOnTheScreen();
      expect(getByText('$1,001.24')).toBeOnTheScreen();
      // The steps still render below the fees.
      expect(getByText('Steps (4 completed)')).toBeOnTheScreen();
    });

    it('omits the fee rows when no local transaction backs the feed row', () => {
      const { queryByText, getByText } = renderWithProvider(
        <PerpsDetails item={feedItem()} />,
      );

      expect(queryByText('Transaction fee')).toBeNull();
      expect(queryByText('Total amount')).toBeNull();
      expect(getByText('Steps (4 completed)')).toBeOnTheScreen();
    });

    it('renders the funding screen with fees for a local-only deposit', () => {
      // What "Track" opens: the feed has not returned the row yet, so the local
      // transaction is all there is. It must still be the Perps funding screen.
      const { getByText } = renderWithProvider(
        <PerpsDetails item={localPerpsFundsItem()} />,
      );

      expect(getByText('Transaction fee')).toBeOnTheScreen();
      expect(getByText('$1.23')).toBeOnTheScreen();
      expect(getByText('Bridge fee')).toBeOnTheScreen();
      expect(getByText('Total amount')).toBeOnTheScreen();
      expect(getByText('Steps (4 completed)')).toBeOnTheScreen();
      expect(getByText('Add funds')).toBeOnTheScreen();
      expect(getByText('Fund again')).toBeOnTheScreen();
    });

    it('shows a local-only deposit still in flight as pending steps', () => {
      const { getByText } = renderWithProvider(
        <PerpsDetails item={localPerpsFundsItem('perpsAddFunds', 'pending')} />,
      );

      expect(getByText('Steps (1 completed, 3 pending)')).toBeOnTheScreen();
    });

    it('omits the fee rows for a local-only withdrawal', () => {
      // Withdrawals relabel these rows and have no redesigned copy yet.
      const { queryByText, getByText } = renderWithProvider(
        <PerpsDetails item={localPerpsFundsItem('perpsWithdraw')} />,
      );

      expect(queryByText('Transaction fee')).toBeNull();
      expect(queryByText('Total amount')).toBeNull();
      expect(getByText('Initiate withdrawal')).toBeOnTheScreen();
    });
  });
});
