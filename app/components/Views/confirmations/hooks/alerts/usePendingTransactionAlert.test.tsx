import {
  TransactionStatus,
  TransactionType,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { usePendingTransactionAlert } from './usePendingTransactionAlert';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

const MOCK_SUBMITTED_TRANSACTION_META = {
  id: '1',
  status: TransactionStatus.submitted,
  type: TransactionType.simpleSend,
  chainId: '0x1',
} as unknown as TransactionMeta;

const MOCK_SIGNED_TRANSACTION = {
  id: '3',
  status: TransactionStatus.signed,
  type: TransactionType.simpleSend,
  chainId: '0x1',
} as unknown as TransactionMeta;

const MOCK_ANOTHER_CHAIN_PENDING_TRANSACTION = {
  id: '2',
  status: TransactionStatus.submitted,
  type: TransactionType.simpleSend,
  chainId: '0x2',
} as unknown as TransactionMeta;

jest.mock('../transactions/useTransactionMetadataRequest');

describe('usePendingTransactionAlert', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionMetadataRequest.mockReturnValue(
      MOCK_SUBMITTED_TRANSACTION_META,
    );
  });

  it('returns alert if there is a submitted transaction (pending)', () => {
    const { result } = renderHookWithProvider(
      () => usePendingTransactionAlert(),
      {
        state: {
          engine: {
            backgroundState: {
              TransactionController: {
                transactions: [
                  MOCK_SUBMITTED_TRANSACTION_META,
                  MOCK_ANOTHER_CHAIN_PENDING_TRANSACTION,
                ],
              },
            },
          },
        },
      },
    );
    expect(result.current).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Pending transaction',
        }),
      ]),
    );
  });

  it('returns alert if there are multiple transactions with at least one submitted (pending)', () => {
    const { result } = renderHookWithProvider(
      () => usePendingTransactionAlert(),
      {
        state: {
          engine: {
            backgroundState: {
              TransactionController: {
                transactions: [
                  MOCK_SUBMITTED_TRANSACTION_META,
                  MOCK_SIGNED_TRANSACTION,
                  MOCK_ANOTHER_CHAIN_PENDING_TRANSACTION,
                ],
              },
            },
          },
        },
      },
    );
    expect(result.current).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Pending transaction',
        }),
      ]),
    );
  });

  it('does not return an alert if no transactions', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);
    const { result } = renderHookWithProvider(
      () => usePendingTransactionAlert(),
      {
        state: {
          engine: {
            backgroundState: {
              TransactionController: {
                transactions: [],
              },
            },
          },
        },
      },
    );
    expect(result.current).toEqual([]);
  });

  it('does not return an alert if transaction is not pending and on the same chain', () => {
    const { result } = renderHookWithProvider(
      () => usePendingTransactionAlert(),
      {
        state: {
          engine: {
            backgroundState: {
              TransactionController: {
                transactions: [
                  MOCK_SIGNED_TRANSACTION,
                  MOCK_ANOTHER_CHAIN_PENDING_TRANSACTION,
                ],
              },
            },
          },
        },
      },
    );
    expect(result.current).toEqual([]);
  });
});
