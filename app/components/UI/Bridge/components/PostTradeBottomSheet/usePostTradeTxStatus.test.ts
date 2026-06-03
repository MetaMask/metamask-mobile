import { renderHook } from '@testing-library/react-native';
import { StatusTypes as BridgeStatus } from '@metamask/bridge-controller';
import { TransactionStatus as TxStatus } from '@metamask/transaction-controller';
import { PostTradeStatus as Status } from './PostTradeBottomSheet.types';
import { usePostTradeTxStatus } from './usePostTradeTxStatus';

let mockTransactionMeta: { status: TxStatus } | undefined;
let mockBridgeHistory = {};

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));
jest.mock('../../../../../selectors/transactionController', () => ({
  selectTransactionMetadataById: () => mockTransactionMeta,
}));
jest.mock('../../../../../selectors/bridgeStatusController', () => ({
  selectBridgeHistoryForAccount: () => mockBridgeHistory,
}));

const statusOf = (
  txStatus?: TxStatus,
  bridgeStatus?: BridgeStatus,
  isBridge = false,
) => {
  mockTransactionMeta = txStatus ? { status: txStatus } : undefined;
  mockBridgeHistory = bridgeStatus
    ? { 'tx-id': { status: { status: bridgeStatus } } }
    : {};

  const params = {
    initialStatus: Status.InProgress,
    isBridge,
    transactionMetaId: 'tx-id',
  };
  return renderHook(() => usePostTradeTxStatus(params)).result.current;
};

describe('usePostTradeTxStatus', () => {
  it('maps transaction and bridge statuses', () => {
    expect(statusOf(TxStatus.confirmed)).toBe(Status.Success);
    expect(statusOf(TxStatus.confirmed, undefined, true)).toBe(
      Status.InProgress,
    );
    expect(statusOf(TxStatus.failed)).toBe(Status.Failed);
    expect(statusOf(undefined, BridgeStatus.COMPLETE)).toBe(Status.Success);
    expect(statusOf(undefined, BridgeStatus.FAILED)).toBe(Status.Failed);
    expect(statusOf(undefined, BridgeStatus.UNKNOWN)).toBe(Status.InProgress);
  });
});
