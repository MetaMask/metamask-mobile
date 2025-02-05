import { ApprovalType } from '@metamask/controller-utils';
import {
  TransactionControllerState,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';

import { useTransactionMetadata } from './useTransactionMetadata';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';

const ID_MOCK = '123-456-789';

const APPROVAL_REQUEST_MOCK = {
  id: ID_MOCK,
  type: ApprovalType.Transaction,
};

const TRANSACTION_METADATA_MOCK = {
  id: ID_MOCK,
  type: TransactionType.contractInteraction,
};

function renderHook({
  approvalType,
  transactionMetadata,
}: {
  approvalType?: ApprovalType;
  transactionMetadata: Partial<TransactionMeta>;
}) {
  const { result } = renderHookWithProvider(useTransactionMetadata, {
    state: {
      engine: {
        backgroundState: {
          ApprovalController: {
            pendingApprovals: {
              [ID_MOCK]: {
                ...APPROVAL_REQUEST_MOCK,
                type: approvalType ?? ApprovalType.Transaction,
              },
            },
          },
          TransactionController: {
            transactions: [transactionMetadata],
          } as unknown as TransactionControllerState,
        },
      },
    },
  });

  return result.current;
}

describe('useTransactionMetadata', () => {
  it('returns transaction metadata when approval type is Transaction', () => {
    const result = renderHook({
      transactionMetadata: TRANSACTION_METADATA_MOCK,
    });

    expect(result).toEqual(TRANSACTION_METADATA_MOCK);
  });

  it('returns undefined when approval type is not Transaction', () => {
    const result = renderHook({
      approvalType: ApprovalType.PersonalSign,
      transactionMetadata: TRANSACTION_METADATA_MOCK,
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined when transaction metadata is not found', () => {
    const result = renderHook({
      transactionMetadata: {
        ...TRANSACTION_METADATA_MOCK,
        id: 'invalid-id',
      },
    });

    expect(result).toBeUndefined();
  });
});
