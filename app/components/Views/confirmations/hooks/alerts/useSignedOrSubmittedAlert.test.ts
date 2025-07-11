import {
  TransactionStatus,
  TransactionType,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useSignedOrSubmittedAlert } from './useSignedOrSubmittedAlert';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

const MOCK_SIGNED_TRANSACTION_META = {
  id: '1',
  status: TransactionStatus.signed,
  type: TransactionType.simpleSend,
  from: '0x123',
  to: '0x456',
};

const MOCK_APPROVED_TRANSACTION_META = {
  id: '2',
  status: TransactionStatus.approved,
  type: TransactionType.simpleSend,
  from: '0x123',
  to: '0x456',
};

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

describe('useSignedOrSubmittedAlert', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionMetadataRequest.mockReturnValue({
      id: '3',
      status: TransactionStatus.confirmed,
      type: TransactionType.simpleSend,
    } as TransactionMeta);
  });

  it('returns empty array if no transactions', () => {
    const { result } = renderHookWithProvider(
      () => useSignedOrSubmittedAlert(),
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

  it('does not return alert if transaction metadata is present in the signed or approved transactions', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      id: '3',
      status: TransactionStatus.approved,
      type: TransactionType.simpleSend,
    } as TransactionMeta);

    const { result } = renderHookWithProvider(
      () => useSignedOrSubmittedAlert(),
      {
        state: {
          engine: {
            backgroundState: {
              TransactionController: {
                transactions: [
                  {
                    id: '3',
                    status: TransactionStatus.approved,
                    type: TransactionType.simpleSend,
                  },
                ],
              },
            },
          },
        },
      },
    );
    expect(result.current).toEqual([]);
  });

  it.each([
    ['signed', MOCK_SIGNED_TRANSACTION_META],
    ['approved', MOCK_APPROVED_TRANSACTION_META],
  ])(
    'returns alert if there is a %s transaction',
    (_status, transactionMeta) => {
      const { result } = renderHookWithProvider(
        () => useSignedOrSubmittedAlert(),
        {
          state: {
            engine: {
              backgroundState: {
                TransactionController: {
                  transactions: [transactionMeta],
                },
              },
            },
          },
        },
      );
      expect(result.current).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message:
              'A previous transaction is still being signed or submitted.',
          }),
        ]),
      );
    },
  );
});
