import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useSignedOrSubmittedAlert } from './useSignedOrSubmittedAlert';
import { useConfirmationContext } from '../../context/confirmation-context';

jest.mock('../../context/confirmation-context', () => ({
  useConfirmationContext: jest.fn(),
}));

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

describe('useSignedOrSubmittedAlert', () => {
  const mockUseConfirmationContext = jest.mocked(useConfirmationContext);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConfirmationContext.mockReturnValue({
      isConfirmationDismounting: false,
    } as ReturnType<typeof useConfirmationContext>);
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

  it('returns empty array if isConfirmationDismounting is true', () => {
    mockUseConfirmationContext.mockReturnValue({
      isConfirmationDismounting: true,
    } as ReturnType<typeof useConfirmationContext>);
    const { result } = renderHookWithProvider(
      () => useSignedOrSubmittedAlert(),
      {
        state: {
          engine: {
            backgroundState: {
              TransactionController: {
                transactions: [MOCK_SIGNED_TRANSACTION_META],
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
