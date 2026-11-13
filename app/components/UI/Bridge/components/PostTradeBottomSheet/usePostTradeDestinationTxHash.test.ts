import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { selectBridgeHistoryForAccount } from '../../../../../selectors/bridgeStatusController';
import { selectTransactionMetadataById } from '../../../../../selectors/transactionController';
import { usePostTradeDestinationTxHash } from './usePostTradeDestinationTxHash';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../../selectors/bridgeStatusController', () => ({
  selectBridgeHistoryForAccount: jest.fn(),
}));
jest.mock('../../../../../selectors/transactionController', () => ({
  selectTransactionMetadataById: jest.fn(),
}));

const SOURCE_HASH = '0xsource';
const DEST_HASH = '0xdestination';

const mockSelectors = ({
  bridgeHistory = {},
  transactionMeta,
}: {
  bridgeHistory?: Record<string, unknown>;
  transactionMeta?: { id: string; hash?: string; actionId?: string };
} = {}) => {
  jest
    .mocked(selectTransactionMetadataById)
    .mockReturnValue(transactionMeta as never);
  (useSelector as jest.Mock).mockImplementation((selector) =>
    selector === selectBridgeHistoryForAccount ? bridgeHistory : selector({}),
  );
};

const bridgeEntry = (destTxHash?: string) => ({
  status: {
    srcChain: { txHash: SOURCE_HASH },
    ...(destTxHash ? { destChain: { txHash: destTxHash } } : {}),
  },
});

describe('usePostTradeDestinationTxHash', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the destination hash of the bridge entry keyed by the transaction id', () => {
    mockSelectors({
      bridgeHistory: { 'meta-1': bridgeEntry(DEST_HASH) },
      transactionMeta: { id: 'meta-1', hash: SOURCE_HASH },
    });

    const { result } = renderHook(() =>
      usePostTradeDestinationTxHash({
        transactionMetaId: 'meta-1',
        transactionHash: SOURCE_HASH,
      }),
    );

    expect(result.current).toBe(DEST_HASH);
  });

  it('returns undefined while the bridge has no destination hash yet', () => {
    mockSelectors({
      bridgeHistory: { 'meta-1': bridgeEntry() },
      transactionMeta: { id: 'meta-1', hash: SOURCE_HASH },
    });

    const { result } = renderHook(() =>
      usePostTradeDestinationTxHash({
        transactionMetaId: 'meta-1',
        transactionHash: SOURCE_HASH,
      }),
    );

    expect(result.current).toBeUndefined();
  });

  it('finds the entry by the submitted hash when the id does not match', () => {
    mockSelectors({
      bridgeHistory: { 'other-id': bridgeEntry(DEST_HASH) },
    });

    const { result } = renderHook(() =>
      usePostTradeDestinationTxHash({
        transactionHash: SOURCE_HASH.toUpperCase(),
      }),
    );

    expect(result.current).toBe(DEST_HASH);
  });

  it('returns undefined when no bridge entry matches', () => {
    mockSelectors({
      bridgeHistory: { 'other-id': bridgeEntry(DEST_HASH) },
    });

    const { result } = renderHook(() =>
      usePostTradeDestinationTxHash({
        transactionMetaId: 'meta-missing',
        transactionHash: '0xunknown',
      }),
    );

    expect(result.current).toBeUndefined();
  });
});
