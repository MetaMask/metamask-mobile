import {
  MOCK_ACCOUNT,
  createCard,
  createOperation,
  createTestState,
  renderHookWithQueryClient,
} from '../../../views/testUtils';
import {
  useAttentionOperations,
  useCollectorCryptOperation,
} from './useCollectorCryptOperation';

const CARD = createCard({ mint: 'MintA' });
const OPENED = createOperation({
  memo: 'memo-opened',
  status: 'opened',
  mint: 'MintA',
  createdAt: 1,
});
const PROCESSING = createOperation({
  memo: 'memo-processing',
  status: 'signed',
  createdAt: 2,
});

describe('useCollectorCryptOperation', () => {
  it('returns the operation and its card once opened', () => {
    const { result } = renderHookWithQueryClient(
      () => useCollectorCryptOperation(MOCK_ACCOUNT.address, 'memo-opened'),
      { state: createTestState({ cards: [CARD], operations: [OPENED] }) },
    );

    expect(result.current.operation).toStrictEqual(OPENED);
    expect(result.current.card).toStrictEqual(CARD);
  });

  it('returns no card before the pack is opened', () => {
    const { result } = renderHookWithQueryClient(
      () => useCollectorCryptOperation(MOCK_ACCOUNT.address, 'memo-processing'),
      { state: createTestState({ cards: [CARD], operations: [PROCESSING] }) },
    );

    expect(result.current.operation).toStrictEqual(PROCESSING);
    expect(result.current.card).toBeUndefined();
  });

  it('returns nothing for an unknown memo', () => {
    const { result } = renderHookWithQueryClient(
      () => useCollectorCryptOperation(MOCK_ACCOUNT.address, 'unknown'),
      { state: createTestState({ operations: [PROCESSING] }) },
    );

    expect(result.current).toStrictEqual({
      operation: undefined,
      card: undefined,
    });
  });
});

describe('useAttentionOperations', () => {
  it('returns the operations needing the user, newest first', () => {
    const { result } = renderHookWithQueryClient(
      () => useAttentionOperations(MOCK_ACCOUNT.address),
      { state: createTestState({ operations: [OPENED, PROCESSING] }) },
    );

    expect(result.current.map((operation) => operation.memo)).toStrictEqual([
      'memo-processing',
      'memo-opened',
    ]);
  });

  it('returns an empty list without an address', () => {
    const { result } = renderHookWithQueryClient(
      () => useAttentionOperations(undefined),
      { state: createTestState({ operations: [OPENED] }) },
    );

    expect(result.current).toStrictEqual([]);
  });
});
