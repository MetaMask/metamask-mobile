import { renderHook } from '@testing-library/react-native';
import { StatusTypes } from '@metamask/bridge-controller';
import { TransactionStatus, type TransactionMeta } from '@metamask/transaction-controller';
import { PostTradeStatus } from './PostTradeBottomSheet.types';
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

type StatusOptions = { txStatus?: TransactionStatus; bridgeStatus?: StatusTypes; initialStatus?: PostTradeStatus };

const renderStatus = ({ txStatus, bridgeStatus, initialStatus = PostTradeStatus.InProgress }: StatusOptions) => {
  mockTransactionMeta = txStatus ? ({ status: txStatus } as TransactionMeta) : undefined;
  mockBridgeHistory = bridgeStatus ? { 'tx-id': { status: { status: bridgeStatus } } } : {};

  return renderHook(() => usePostTradeTxStatus({ initialStatus, transactionMetaId: 'tx-id' })).result.current;
};

describe('usePostTradeTxStatus', () => {
  const postTradeStatus = PostTradeStatus;

  it.each([
    ['controller error', { initialStatus: postTradeStatus.Failed }, postTradeStatus.Failed],
    ['submitted transaction', { txStatus: TransactionStatus.submitted }, postTradeStatus.InProgress],
    ['confirmed transaction', { txStatus: TransactionStatus.confirmed }, postTradeStatus.Success],
    ['failed transaction', { txStatus: TransactionStatus.failed }, postTradeStatus.Failed],
    ['complete bridge history', { bridgeStatus: StatusTypes.COMPLETE }, postTradeStatus.Success],
    ['failed bridge history', { bridgeStatus: StatusTypes.FAILED }, postTradeStatus.Failed],
  ])('returns mapped status for %s', (_label, options, expectedStatus) => {
    expect(renderStatus(options)).toBe(expectedStatus);
  });
});
