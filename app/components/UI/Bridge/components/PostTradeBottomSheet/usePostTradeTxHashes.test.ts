import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { selectBridgeHistoryForAccount } from '../../../../../selectors/bridgeStatusController';
import { selectTransactionMetadataById } from '../../../../../selectors/transactionController';
import { usePostTradeTxHashes } from './usePostTradeTxHashes';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../../selectors/bridgeStatusController', () => ({
  selectBridgeHistoryForAccount: jest.fn(),
}));
jest.mock('../../../../../selectors/transactionController', () => ({
  selectTransactionMetadataById: jest.fn(),
}));

const SOURCE_HASH = '0xsource';
const REPORTED_HASH = '0xreported';
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

const bridgeEntry = ({
  srcTxHash,
  destTxHash,
  reportedSubmittedTxHash,
}: {
  srcTxHash?: string;
  destTxHash?: string;
  reportedSubmittedTxHash?: string;
} = {}) => ({
  ...(reportedSubmittedTxHash ? { reportedSubmittedTxHash } : {}),
  status: {
    ...(srcTxHash ? { srcChain: { txHash: srcTxHash } } : {}),
    ...(destTxHash ? { destChain: { txHash: destTxHash } } : {}),
  },
});

describe('usePostTradeTxHashes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns both hashes of the bridge entry keyed by the transaction id', () => {
    mockSelectors({
      bridgeHistory: {
        'meta-1': bridgeEntry({
          srcTxHash: SOURCE_HASH,
          destTxHash: DEST_HASH,
        }),
      },
      transactionMeta: { id: 'meta-1', hash: SOURCE_HASH },
    });

    const { result } = renderHook(() =>
      usePostTradeTxHashes({
        transactionMetaId: 'meta-1',
        transactionHash: SOURCE_HASH,
      }),
    );

    expect(result.current).toEqual({
      submittedTxHash: SOURCE_HASH,
      destinationTxHash: DEST_HASH,
    });
  });

  it('returns no destination hash while the bridge has none yet', () => {
    mockSelectors({
      bridgeHistory: { 'meta-1': bridgeEntry({ srcTxHash: SOURCE_HASH }) },
      transactionMeta: { id: 'meta-1', hash: SOURCE_HASH },
    });

    const { result } = renderHook(() =>
      usePostTradeTxHashes({
        transactionMetaId: 'meta-1',
        transactionHash: SOURCE_HASH,
      }),
    );

    expect(result.current.destinationTxHash).toBeUndefined();
  });

  it('reads the submitted hash from the transaction meta once it is set', () => {
    mockSelectors({ transactionMeta: { id: 'meta-1', hash: SOURCE_HASH } });

    const { result } = renderHook(() =>
      usePostTradeTxHashes({ transactionMetaId: 'meta-1' }),
    );

    expect(result.current.submittedTxHash).toBe(SOURCE_HASH);
  });

  it('falls back to the hash the bridge history reports when submit returned none', () => {
    mockSelectors({
      bridgeHistory: {
        'meta-1': bridgeEntry({
          srcTxHash: SOURCE_HASH,
          reportedSubmittedTxHash: REPORTED_HASH,
        }),
      },
      transactionMeta: { id: 'meta-1', hash: '' },
    });

    const { result } = renderHook(() =>
      usePostTradeTxHashes({ transactionMetaId: 'meta-1' }),
    );

    expect(result.current.submittedTxHash).toBe(REPORTED_HASH);
  });

  it('falls back to the source-chain hash in the bridge status', () => {
    mockSelectors({
      bridgeHistory: { 'meta-1': bridgeEntry({ srcTxHash: SOURCE_HASH }) },
      transactionMeta: { id: 'meta-1' },
    });

    const { result } = renderHook(() =>
      usePostTradeTxHashes({ transactionMetaId: 'meta-1' }),
    );

    expect(result.current.submittedTxHash).toBe(SOURCE_HASH);
  });

  it('never returns the transaction id as the submitted hash', () => {
    mockSelectors({
      bridgeHistory: { 'meta-1': bridgeEntry() },
      transactionMeta: { id: 'meta-1' },
    });

    const { result } = renderHook(() =>
      usePostTradeTxHashes({ transactionMetaId: 'meta-1' }),
    );

    expect(result.current.submittedTxHash).toBeUndefined();
  });

  it('finds the entry by the submitted hash when the id does not match', () => {
    mockSelectors({
      bridgeHistory: {
        'other-id': bridgeEntry({
          srcTxHash: SOURCE_HASH,
          destTxHash: DEST_HASH,
        }),
      },
    });

    const { result } = renderHook(() =>
      usePostTradeTxHashes({ transactionHash: SOURCE_HASH.toUpperCase() }),
    );

    expect(result.current.destinationTxHash).toBe(DEST_HASH);
  });

  it('returns no hashes when nothing matches', () => {
    mockSelectors({
      bridgeHistory: {
        'other-id': bridgeEntry({
          srcTxHash: SOURCE_HASH,
          destTxHash: DEST_HASH,
        }),
      },
    });

    const { result } = renderHook(() =>
      usePostTradeTxHashes({ transactionMetaId: 'meta-missing' }),
    );

    expect(result.current).toEqual({
      submittedTxHash: undefined,
      destinationTxHash: undefined,
    });
  });
});
