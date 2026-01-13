import {
  TransactionStatus,
  TransactionType,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  PAY_TYPES,
  useSignedOrSubmittedAlert,
} from './useSignedOrSubmittedAlert';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { Hex } from '@metamask/utils';
import { AlertKeys } from '../../constants/alerts';
import { strings } from '../../../../../../locales/i18n';
import { Severity } from '../../types/alerts';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { TransactionPaymentToken } from '@metamask/transaction-pay-controller';

const FROM_MOCK = '0x123';
const CHAIN_ID_MOCK = '0x456' as Hex;
const CHAIN_ID_2_MOCK = '0x789' as Hex;

const TRANSACTION_META_MOCK = {
  id: '1',
  status: TransactionStatus.signed,
  type: TransactionType.simpleSend,
  chainId: CHAIN_ID_MOCK,
  txParams: {
    from: FROM_MOCK,
  },
};

jest.mock('../pay/useTransactionPayToken');

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

describe('useSignedOrSubmittedAlert', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: jest.fn(),
    });

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

  it.each(PAY_TYPES)(
    'returns alert if current and existing transaction are %s',
    (type) => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        ...TRANSACTION_META_MOCK,
        id: '2',
        status: TransactionStatus.confirmed,
        type,
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
                      type,
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
          title: strings(
            'alert_system.signed_or_submitted_perps_deposit.title',
          ),
          severity: Severity.Danger,
        },
      ]);
    },
  );

  it.each(PAY_TYPES)(
    'returns alert if existing transaction is submitted and current type is %s',
    (type) => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        ...TRANSACTION_META_MOCK,
        id: '2',
        status: TransactionStatus.confirmed,
        type,
      } as TransactionMeta);

      const existingTransaction = {
        ...TRANSACTION_META_MOCK,
        status: TransactionStatus.submitted,
      };

      const { result } = renderHookWithProvider(
        () => useSignedOrSubmittedAlert(),
        {
          state: {
            engine: {
              backgroundState: {
                TransactionController: {
                  transactions: [existingTransaction],
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

  it.each([
    TransactionStatus.signed,
    TransactionStatus.approved,
    TransactionStatus.submitted,
  ])(
    'returns alert if %s transaction on pay token chain from same account',
    (status) => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          chainId: CHAIN_ID_2_MOCK,
        } as TransactionPaymentToken,
        setPayToken: jest.fn(),
      });

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
                      chainId: CHAIN_ID_2_MOCK,
                      status,
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
            'alert_system.signed_or_submitted_pay_token.message',
          ),
          title: strings('alert_system.signed_or_submitted_pay_token.title'),
          severity: Severity.Danger,
        },
      ]);
    },
  );
});
