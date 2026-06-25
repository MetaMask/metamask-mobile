import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
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
});
