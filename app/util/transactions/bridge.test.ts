import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { getIsBridgeApprovalOrBridgeTransaction } from './bridge';

describe('getIsBridgeApprovalOrBridgeTransaction', () => {
  it('should return true for bridge approval transactions', () => {
    const txMeta = {
      type: TransactionType.bridgeApproval,
    } as TransactionMeta;

    const result = getIsBridgeApprovalOrBridgeTransaction(txMeta);

    expect(result).toBe(true);
  });

  it('should return true for bridge transactions', () => {
    const txMeta = {
      type: TransactionType.bridge,
    } as TransactionMeta;

    const result = getIsBridgeApprovalOrBridgeTransaction(txMeta);

    expect(result).toBe(true);
  });

  it('should return false for other transaction types', () => {
    const txMeta = {
      type: TransactionType.simpleSend,
    } as TransactionMeta;

    const result = getIsBridgeApprovalOrBridgeTransaction(txMeta);

    expect(result).toBe(false);
  });
});
