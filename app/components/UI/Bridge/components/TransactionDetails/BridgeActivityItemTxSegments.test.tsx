import React from 'react';
import { render } from '@testing-library/react-native';
import BridgeActivityItemTxSegments from './BridgeActivityItemTxSegments';
import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { StatusTypes } from '@metamask/bridge-controller';

describe('BridgeActivityItemTxSegments', () => {
  it('should render with basic props', () => {
    const mockTransaction: TransactionMeta = {
      status: TransactionStatus.confirmed,
    } as TransactionMeta;

    const { getByText } = render(
      <BridgeActivityItemTxSegments
        transactionStatus={mockTransaction.status}
      />,
    );

    expect(getByText('Transaction 2 of 2')).toBeTruthy();
  });

  it('should show transaction 1 of 2 for pending transaction', () => {
    const mockTransaction: TransactionMeta = {
      status: TransactionStatus.submitted,
    } as TransactionMeta;

    const { getByText } = render(
      <BridgeActivityItemTxSegments
        transactionStatus={mockTransaction.status}
      />,
    );

    expect(getByText('Transaction 1 of 2')).toBeTruthy();
  });

  it('should show complete status for both transactions when bridge history is complete', () => {
    const mockTransaction: TransactionMeta = {
      status: TransactionStatus.confirmed,
    } as TransactionMeta;

    const mockBridgeHistory: BridgeHistoryItem = {
      status: {
        status: StatusTypes.COMPLETE,
        destChain: {
          txHash: '0x123',
        },
      },
    } as BridgeHistoryItem;

    const { getByText } = render(
      <BridgeActivityItemTxSegments
        transactionStatus={mockTransaction.status}
        bridgeTxHistoryItem={mockBridgeHistory}
      />,
    );

    expect(getByText('Transaction 2 of 2')).toBeTruthy();
  });

  it('should show pending status for second transaction when bridge history is pending', () => {
    const mockTransaction: TransactionMeta = {
      status: TransactionStatus.confirmed,
    } as TransactionMeta;

    const mockBridgeHistory: BridgeHistoryItem = {
      status: {
        status: StatusTypes.PENDING,
        destChain: {
          txHash: '0x123',
        },
      },
    } as BridgeHistoryItem;

    const { getByText } = render(
      <BridgeActivityItemTxSegments
        transactionStatus={mockTransaction.status}
        bridgeTxHistoryItem={mockBridgeHistory}
      />,
    );

    expect(getByText('Transaction 2 of 2')).toBeTruthy();
  });
});
