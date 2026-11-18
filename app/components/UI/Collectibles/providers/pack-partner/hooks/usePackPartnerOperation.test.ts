import type { RootState } from '../../../../../../reducers';
import type { DeepPartial } from '../../../../../../util/test/renderWithProvider';
import type {
  PackPartnerBuybackOperation,
  PackPartnerPackOperation,
} from '../types';
import {
  MOCK_ACCOUNT,
  createCard,
  createOperation,
  createTestState,
  renderHookWithQueryClient,
} from '../../../views/testUtils';
import {
  useAttentionOperations,
  usePackPartnerOperation,
} from './usePackPartnerOperation';

/** Redux state with the operation journal of MOCK_ACCOUNT. */
const createJournalState = ({
  operations = [],
  sales = [],
}: {
  operations?: PackPartnerPackOperation[];
  sales?: PackPartnerBuybackOperation[];
}): DeepPartial<RootState> => {
  const state = createTestState();
  return {
    ...state,
    engine: {
      ...state.engine,
      backgroundState: {
        ...state.engine?.backgroundState,
        CollectiblesController: {
          hasCompletedOnboarding: true,
          packPartner: {
            operations: {
              [MOCK_ACCOUNT.address]: Object.fromEntries(
                operations.map((operation) => [operation.memo, operation]),
              ),
            },
            sales: {
              [MOCK_ACCOUNT.address]: Object.fromEntries(
                sales.map((sale) => [sale.mint, sale]),
              ),
            },
          },
        },
      },
    },
  };
};

const CARD = createCard({ mint: 'MintA', memo: 'memo-opened' });
const OPENED = createOperation({
  memo: 'memo-opened',
  status: 'opened',
  mint: 'MintA',
  result: CARD,
  createdAt: 1,
});
const PROCESSING = createOperation({
  memo: 'memo-processing',
  status: 'submitted',
  createdAt: 2,
});
const SALE: PackPartnerBuybackOperation = {
  mint: 'MintA',
  memo: 'sale-memo',
  status: 'completed',
  amount: '42500000',
  submissionAttempted: true,
  signature: 'sale-signature',
  createdAt: 3,
  updatedAt: 4,
};

describe('usePackPartnerOperation', () => {
  it('returns the operation and its awarded card once opened', () => {
    const { result } = renderHookWithQueryClient(
      () => usePackPartnerOperation(MOCK_ACCOUNT.address, 'memo-opened'),
      { state: createJournalState({ operations: [OPENED] }) },
    );

    expect(result.current.operation).toStrictEqual(OPENED);
    expect(result.current.card).toStrictEqual(CARD);
  });

  it('shows the sale of the awarded card from the buyback journal', () => {
    const { result } = renderHookWithQueryClient(
      () => usePackPartnerOperation(MOCK_ACCOUNT.address, 'memo-opened'),
      { state: createJournalState({ operations: [OPENED], sales: [SALE] }) },
    );

    expect(result.current.card).toStrictEqual({
      ...CARD,
      sale: {
        status: 'completed',
        amount: '42500000',
        signature: 'sale-signature',
        updatedAt: 4,
      },
    });
    expect(result.current.operation?.result).toStrictEqual(CARD);
  });

  it('keeps the automatic Turbo sale of the awarded card', () => {
    const turboCard = createCard({
      mint: 'MintA',
      buyback: { status: 'unavailable' },
      sale: {
        status: 'completed',
        automatic: true,
        amount: '42500000',
        updatedAt: 1,
      },
    });
    const turbo = createOperation({
      memo: 'memo-turbo',
      status: 'opened',
      mint: 'MintA',
      result: turboCard,
    });

    const { result } = renderHookWithQueryClient(
      () => usePackPartnerOperation(MOCK_ACCOUNT.address, 'memo-turbo'),
      { state: createJournalState({ operations: [turbo] }) },
    );

    expect(result.current.card).toStrictEqual(turboCard);
  });

  it('returns no card before the pack is opened', () => {
    const { result } = renderHookWithQueryClient(
      () => usePackPartnerOperation(MOCK_ACCOUNT.address, 'memo-processing'),
      {
        state: createJournalState({ operations: [PROCESSING], sales: [SALE] }),
      },
    );

    expect(result.current.operation).toStrictEqual(PROCESSING);
    expect(result.current.card).toBeUndefined();
  });

  it('returns no card for an opened operation without a result', () => {
    const { result: _result, ...withoutResult } = OPENED;

    const { result } = renderHookWithQueryClient(
      () => usePackPartnerOperation(MOCK_ACCOUNT.address, 'memo-opened'),
      { state: createJournalState({ operations: [withoutResult] }) },
    );

    expect(result.current.operation).toStrictEqual(withoutResult);
    expect(result.current.card).toBeUndefined();
  });

  it('returns nothing for an unknown memo', () => {
    const { result } = renderHookWithQueryClient(
      () => usePackPartnerOperation(MOCK_ACCOUNT.address, 'unknown'),
      { state: createJournalState({ operations: [PROCESSING] }) },
    );

    expect(result.current).toStrictEqual({
      operation: undefined,
      card: undefined,
    });
  });

  it('returns nothing without an address', () => {
    const { result } = renderHookWithQueryClient(
      () => usePackPartnerOperation(undefined, 'memo-opened'),
      { state: createJournalState({ operations: [OPENED] }) },
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
      { state: createJournalState({ operations: [OPENED, PROCESSING] }) },
    );

    expect(result.current.map((operation) => operation.memo)).toStrictEqual([
      'memo-processing',
      'memo-opened',
    ]);
  });

  it('returns an empty list without an address', () => {
    const { result } = renderHookWithQueryClient(
      () => useAttentionOperations(undefined),
      { state: createJournalState({ operations: [OPENED] }) },
    );

    expect(result.current).toStrictEqual([]);
  });
});
