import {
  TransactionStatus,
  TransactionType,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useSignedOrSubmittedAlert } from './useSignedOrSubmittedAlert';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { Hex } from '@metamask/utils';
import { AlertKeys } from '../../constants/alerts';
import { strings } from '../../../../../../locales/i18n';
import { Severity } from '../../types/alerts';

const FROM_MOCK = '0x123';
const CHAIN_ID_MOCK = '0x456' as Hex;

const TRANSACTION_META_MOCK = {
  id: '1',
  status: TransactionStatus.signed,
  type: TransactionType.simpleSend,
  chainId: CHAIN_ID_MOCK,
  txParams: {
    from: FROM_MOCK,
  },
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
      ...TRANSACTION_META_MOCK,
      id: '2',
      status: TransactionStatus.confirmed,
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
    const { result } = renderHookWithProvider(
      () => useSignedOrSubmittedAlert(),
      {
        state: {
          engine: {
            backgroundState: {
              TransactionController: {
                transactions: [
                  {
                    ...TRANSACTION_META_MOCK,
                    id: '2',
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
    ['signed', { ...TRANSACTION_META_MOCK, status: TransactionStatus.signed }],
    [
      'approved',
      { ...TRANSACTION_META_MOCK, status: TransactionStatus.approved },
    ],
  ])(
    'returns alert if there is a %s transaction on same chain and account',
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

      expect(result.current).toStrictEqual([
        {
          isBlocking: true,
          key: AlertKeys.SignedOrSubmitted,
          message: strings('alert_system.signed_or_submitted.message'),
          title: strings('alert_system.signed_or_submitted.title'),
          severity: Severity.Danger,
        },
      ]);
    },
  );

  it('returns no alerts if on different chain', () => {
    const { result } = renderHookWithProvider(
      () => useSignedOrSubmittedAlert(),
      {
        state: {
          engine: {
            backgroundState: {
              TransactionController: {
                transactions: [{ ...TRANSACTION_META_MOCK, chainId: '0x789' }],
              },
            },
          },
        },
      },
    );

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alerts if from different account', () => {
    const { result } = renderHookWithProvider(
      () => useSignedOrSubmittedAlert(),
      {
        state: {
          engine: {
            backgroundState: {
              TransactionController: {
                transactions: [
                  { ...TRANSACTION_META_MOCK, txParams: { from: '0x456' } },
                ],
              },
            },
          },
        },
      },
    );

    expect(result.current).toStrictEqual([]);
  });

  it('returns alert if current and existing transaction are perps deposit', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...TRANSACTION_META_MOCK,
      id: '2',
      status: TransactionStatus.confirmed,
      type: TransactionType.perpsDeposit,
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
                    ...TRANSACTION_META_MOCK,
                    type: TransactionType.perpsDeposit,
                  },
                ],
              },
            },
          },
        },
      },
    );

    expect(result.current).toStrictEqual([
      {
        isBlocking: true,
        key: AlertKeys.SignedOrSubmitted,
        message: strings(
          'alert_system.signed_or_submitted_perps_deposit.message',
        ),
        title: strings('alert_system.signed_or_submitted_perps_deposit.title'),
        severity: Severity.Danger,
      },
    ]);
  });
});
