import { renderHook } from '@testing-library/react-native';
import { StatusTypes as BridgeStatus } from '@metamask/bridge-controller';
import {
  TransactionStatus as TxStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { PostTradeStatus as Status } from './PostTradeBottomSheet.types';
import { usePostTradeTxStatus } from './usePostTradeTxStatus';

let mockTransactionMeta: TransactionMeta | undefined;
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

const renderStatus = (
  txStatus?: TxStatus,
  bridgeStatus?: BridgeStatus,
  initialStatus = Status.InProgress,
) => {
  mockTransactionMeta = txStatus
    ? ({ status: txStatus } as TransactionMeta)
    : undefined;
  mockBridgeHistory = bridgeStatus
    ? { 'tx-id': { status: { status: bridgeStatus } } }
    : {};

  return renderHook(() =>
    usePostTradeTxStatus({ initialStatus, transactionMetaId: 'tx-id' }),
  ).result.current;
};

describe('usePostTradeTxStatus', () => {
  it('maps transaction and bridge statuses', () => {
    expect(renderStatus(undefined, undefined, Status.Failed)).toBe(
      Status.Failed,
    );
    expect(renderStatus(TxStatus.submitted)).toBe(Status.InProgress);
    expect(renderStatus(TxStatus.confirmed)).toBe(Status.Success);
    expect(renderStatus(TxStatus.failed)).toBe(Status.Failed);
    expect(renderStatus(undefined, BridgeStatus.COMPLETE)).toBe(Status.Success);
    expect(renderStatus(undefined, BridgeStatus.FAILED)).toBe(Status.Failed);
  });
});
