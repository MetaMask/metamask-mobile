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
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useTransactionPayIsPostQuote } from '../pay/useTransactionPayData';
import { isHardwareAccount } from '../../../../../util/address';
import { buildPaymentTokenMock } from '../../__mocks__/pay-token.mock';

const FROM_MOCK = '0x123';
const CHAIN_ID_MOCK = '0x456' as Hex;
const CHAIN_ID_2_MOCK = '0x789' as Hex;
const CHAIN_ID_3_MOCK = '0xabc' as Hex;
const TOKEN_ADDRESS_MOCK = '0x1234567890123456789012345678901234567890';

const PAY_TYPES = [
  TransactionType.moneyAccountDeposit,
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
];

const TRANSACTION_META_MOCK = {
  id: '1',
  status: TransactionStatus.signed,
  type: TransactionType.simpleSend,
  chainId: CHAIN_ID_MOCK,
  txParams: {
    from: FROM_MOCK,
  },
};

const GENERIC_ALERT = {
  isBlocking: true,
  key: AlertKeys.SignedOrSubmitted,
  message: strings('alert_system.signed_or_submitted.message'),
  title: strings('alert_system.signed_or_submitted.title'),
  severity: Severity.Danger,
};

jest.mock('../pay/useTransactionPayToken');
jest.mock('../pay/useTransactionPayData');
jest.mock('../../../../../util/address');

function buildState(transactions: Record<string, unknown>[]) {
  return {
    engine: {
      backgroundState: {
        TransactionController: {
          transactions,
        },
      },
    },
  };
}

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

describe('useSignedOrSubmittedAlert', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const isHardwareAccountMock = jest.mocked(isHardwareAccount);
  const useTransactionPayIsPostQuoteMock = jest.mocked(
    useTransactionPayIsPostQuote,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    isHardwareAccountMock.mockReturnValue(false);
    useTransactionPayIsPostQuoteMock.mockReturnValue(false);

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

      expect(result.current).toStrictEqual([GENERIC_ALERT]);
    },
  );

  it.each(PAY_TYPES)(
    'returns no alert if existing transaction on target chain is submitted and current type is %s',
    (type) => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: TOKEN_ADDRESS_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        }),
        setPayToken: jest.fn(),
      });

      mockUseTransactionMetadataRequest.mockReturnValue({
        ...TRANSACTION_META_MOCK,
        id: '2',
        status: TransactionStatus.confirmed,
        type,
      } as TransactionMeta);

      const { result } = renderHookWithProvider(
        () => useSignedOrSubmittedAlert(),
        {
          state: buildState([
            { ...TRANSACTION_META_MOCK, status: TransactionStatus.submitted },
          ]),
        },
      );

      expect(result.current).toStrictEqual([]);
    },
  );

  it.each(PAY_TYPES)(
    'returns alert if existing transaction is submitted on same chain as pay token and current type is %s',
    (type) => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: TOKEN_ADDRESS_MOCK,
          chainId: CHAIN_ID_MOCK,
        }),
        setPayToken: jest.fn(),
      });

      mockUseTransactionMetadataRequest.mockReturnValue({
        ...TRANSACTION_META_MOCK,
        id: '2',
        status: TransactionStatus.confirmed,
        type,
      } as TransactionMeta);

      const { result } = renderHookWithProvider(
        () => useSignedOrSubmittedAlert(),
        {
          state: buildState([
            { ...TRANSACTION_META_MOCK, status: TransactionStatus.submitted },
          ]),
        },
      );

      expect(result.current).toStrictEqual([GENERIC_ALERT]);
    },
  );

  it('returns alert if submitted transaction on transaction chain for post-quote', () => {
    useTransactionPayIsPostQuoteMock.mockReturnValue(true);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: buildPaymentTokenMock({
        address: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_2_MOCK,
      }),
      setPayToken: jest.fn(),
    });

    const { result } = renderHookWithProvider(
      () => useSignedOrSubmittedAlert(),
      {
        state: buildState([
          { ...TRANSACTION_META_MOCK, status: TransactionStatus.submitted },
        ]),
      },
    );

    expect(result.current).toStrictEqual([GENERIC_ALERT]);
  });

  it('returns no alert if submitted transaction on pay token chain for post-quote', () => {
    useTransactionPayIsPostQuoteMock.mockReturnValue(true);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: buildPaymentTokenMock({
        address: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_2_MOCK,
      }),
      setPayToken: jest.fn(),
    });

    const { result } = renderHookWithProvider(
      () => useSignedOrSubmittedAlert(),
      {
        state: buildState([
          {
            ...TRANSACTION_META_MOCK,
            chainId: CHAIN_ID_2_MOCK,
            status: TransactionStatus.submitted,
          },
        ]),
      },
    );

    expect(result.current).toStrictEqual([]);
  });

  describe('with in-progress MetaMask Pay transaction', () => {
    const PAY_TRANSACTION_MOCK = {
      ...TRANSACTION_META_MOCK,
      metamaskPay: {
        chainId: CHAIN_ID_2_MOCK,
        strategy: 'server',
      },
      status: TransactionStatus.approved,
    };

    it('returns no alert on its target chain', () => {
      const { result } = renderHookWithProvider(
        () => useSignedOrSubmittedAlert(),
        { state: buildState([PAY_TRANSACTION_MOCK]) },
      );

      expect(result.current).toStrictEqual([]);
    });

    it('returns alert on its source chain', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        ...TRANSACTION_META_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        id: '2',
        status: TransactionStatus.unapproved,
      } as TransactionMeta);

      const { result } = renderHookWithProvider(
        () => useSignedOrSubmittedAlert(),
        { state: buildState([PAY_TRANSACTION_MOCK]) },
      );

      expect(result.current).toStrictEqual([GENERIC_ALERT]);
    });

    it('returns no alert on its source chain if source hash is set', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        ...TRANSACTION_META_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        id: '2',
        status: TransactionStatus.unapproved,
      } as TransactionMeta);

      const { result } = renderHookWithProvider(
        () => useSignedOrSubmittedAlert(),
        {
          state: buildState([
            {
              ...PAY_TRANSACTION_MOCK,
              metamaskPay: {
                ...PAY_TRANSACTION_MOCK.metamaskPay,
                sourceHash: '0xabc',
              },
            },
          ]),
        },
      );

      expect(result.current).toStrictEqual([]);
    });

    it('returns alert on its own chain if post-quote', () => {
      const { result } = renderHookWithProvider(
        () => useSignedOrSubmittedAlert(),
        {
          state: buildState([
            {
              ...PAY_TRANSACTION_MOCK,
              metamaskPay: {
                ...PAY_TRANSACTION_MOCK.metamaskPay,
                isPostQuote: true,
              },
            },
          ]),
        },
      );

      expect(result.current).toStrictEqual([GENERIC_ALERT]);
    });

    it.each(PAY_TYPES)(
      'returns pay token alert if current %s uses same pay token chain',
      (type) => {
        useTransactionPayTokenMock.mockReturnValue({
          payToken: buildPaymentTokenMock({
            address: TOKEN_ADDRESS_MOCK,
            chainId: CHAIN_ID_2_MOCK,
          }),
          setPayToken: jest.fn(),
        });

        mockUseTransactionMetadataRequest.mockReturnValue({
          ...TRANSACTION_META_MOCK,
          id: '2',
          status: TransactionStatus.unapproved,
          type,
        } as TransactionMeta);

        const { result } = renderHookWithProvider(
          () => useSignedOrSubmittedAlert(),
          { state: buildState([{ ...PAY_TRANSACTION_MOCK, type }]) },
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

    it.each(PAY_TYPES)(
      'returns no alert if current %s uses different pay token chain',
      (type) => {
        useTransactionPayTokenMock.mockReturnValue({
          payToken: buildPaymentTokenMock({
            address: TOKEN_ADDRESS_MOCK,
            chainId: CHAIN_ID_3_MOCK,
          }),
          setPayToken: jest.fn(),
        });

        mockUseTransactionMetadataRequest.mockReturnValue({
          ...TRANSACTION_META_MOCK,
          id: '2',
          status: TransactionStatus.unapproved,
          type,
        } as TransactionMeta);

        const { result } = renderHookWithProvider(
          () => useSignedOrSubmittedAlert(),
          { state: buildState([{ ...PAY_TRANSACTION_MOCK, type }]) },
        );

        expect(result.current).toStrictEqual([]);
      },
    );
  });

  it.each([
    TransactionStatus.signed,
    TransactionStatus.approved,
    TransactionStatus.submitted,
  ])(
    'returns alert if %s transaction on pay token chain from same account',
    (status) => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: '0x1234567890123456789012345678901234567890',
          chainId: CHAIN_ID_2_MOCK,
        }),
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

  it('returns no alert for hardware wallet mUSD conversion with pending transaction', () => {
    isHardwareAccountMock.mockReturnValue(true);

    mockUseTransactionMetadataRequest.mockReturnValue({
      ...TRANSACTION_META_MOCK,
      id: '2',
      status: TransactionStatus.confirmed,
      type: TransactionType.musdConversion,
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
                    status: TransactionStatus.signed,
                  },
                ],
              },
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  confirmations_pay_hardware: {
                    default: { enabled: false },
                    overrides: {
                      [TransactionType.musdConversion]: { enabled: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    );

    expect(result.current).toStrictEqual([]);
  });

  it('returns alert for non-hardware wallet mUSD conversion with pending transaction', () => {
    isHardwareAccountMock.mockReturnValue(false);

    mockUseTransactionMetadataRequest.mockReturnValue({
      ...TRANSACTION_META_MOCK,
      id: '2',
      status: TransactionStatus.confirmed,
      type: TransactionType.musdConversion,
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
                    status: TransactionStatus.signed,
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
        message: strings('alert_system.signed_or_submitted.message'),
        title: strings('alert_system.signed_or_submitted.title'),
        severity: Severity.Danger,
      },
    ]);
  });
});
