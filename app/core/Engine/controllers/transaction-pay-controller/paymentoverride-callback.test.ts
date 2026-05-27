import {
  CHAIN_IDS,
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import {
  PaymentOverride,
  type GetPaymentOverrideDataRequest,
} from '@metamask/transaction-pay-controller';
import type { Hex } from '@metamask/utils';
import { getMoneyAccountWithdrawTransactionsData } from '../../../../components/UI/Money/utils/moneyAccountTransactions';
import ReduxService from '../../../../core/redux/ReduxService';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { getDelegationTransaction } from '../../../../util/transactions/delegation';
import { getPaymentOverrideData } from './paymentoverride-callback';

jest.mock('../../../../components/UI/Money/utils/moneyAccountTransactions');
jest.mock('../../../../core/redux/ReduxService', () => ({
  __esModule: true,
  default: { store: { getState: jest.fn().mockReturnValue({}) } },
}));
jest.mock('../../../../selectors/moneyAccountController');
jest.mock('../../../../util/transactions/delegation');
const TRANSACTION_ID = 'tx-1';
const MONEY_ACCOUNT_ADDRESS = '0xc4ff9e84b5754570812d891ade0bad3952bb5946';
const USER_EOA = '0x178239802520a9c99dcbd791f81326b70298d629';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      NetworkController: {
        findNetworkClientIdByChainId: jest
          .fn()
          .mockReturnValue('mock-network-client-id'),
      },
    },
  },
}));
const DELEGATION_MANAGER = '0xdb9b1e94b5b69df7e401ddbede43491141047db3';
const DELEGATION_DATA = '0xdelegation-calldata';

const MOCK_WITHDRAW_PARAMS = [
  { to: '0xTeller' as Hex, data: '0xwithdraw' as Hex, value: '0x0' as Hex },
  { to: '0xMusd' as Hex, data: '0xtransfer' as Hex, value: '0x0' as Hex },
];

const AMOUNT_HUMAN = '10.5';

const TRANSACTION_META_MOCK = {
  id: TRANSACTION_ID,
  txParams: { from: USER_EOA },
} as TransactionMeta;

const VALID_TX_DATA = {
  paymentOverride: PaymentOverride.MoneyAccount,
  tokens: [{ chainId: '0x8f' as Hex, amountHuman: AMOUNT_HUMAN }],
};

const mockMessenger = {} as never;

function buildRequest(
  overrides?: Partial<GetPaymentOverrideDataRequest>,
): GetPaymentOverrideDataRequest {
  return {
    amount: AMOUNT_HUMAN,
    transaction: TRANSACTION_META_MOCK,
    transactionData:
      VALID_TX_DATA as GetPaymentOverrideDataRequest['transactionData'],
    ...overrides,
  };
}

const selectPrimaryMoneyAccountMock = jest.mocked(selectPrimaryMoneyAccount);
const getMoneyAccountWithdrawMock = jest.mocked(
  getMoneyAccountWithdrawTransactionsData,
);
const getDelegationTransactionMock = jest.mocked(getDelegationTransaction);

describe('getPaymentOverrideData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ReduxService.store.getState as jest.Mock).mockReturnValue({});
    selectPrimaryMoneyAccountMock.mockReturnValue({
      address: MONEY_ACCOUNT_ADDRESS,
    } as never);
    getMoneyAccountWithdrawMock.mockResolvedValue(MOCK_WITHDRAW_PARAMS);
    getDelegationTransactionMock.mockResolvedValue({
      data: DELEGATION_DATA as Hex,
      to: DELEGATION_MANAGER as Hex,
      value: '0x0' as Hex,
    });
  });

  it('returns empty array when paymentOverride is not MoneyAccount', async () => {
    const result = await getPaymentOverrideData(
      buildRequest({
        transactionData: {
          ...VALID_TX_DATA,
          paymentOverride: undefined,
        } as GetPaymentOverrideDataRequest['transactionData'],
      }),
      mockMessenger,
    );

    expect(result).toStrictEqual([]);
    expect(getMoneyAccountWithdrawMock).not.toHaveBeenCalled();
  });

  it('returns empty array when transaction data is undefined', async () => {
    const result = await getPaymentOverrideData(
      buildRequest({
        transactionData:
          undefined as unknown as GetPaymentOverrideDataRequest['transactionData'],
      }),
      mockMessenger,
    );

    expect(result).toStrictEqual([]);
  });

  it('returns empty array when primary money account is missing', async () => {
    selectPrimaryMoneyAccountMock.mockReturnValue(undefined);

    const result = await getPaymentOverrideData(buildRequest(), mockMessenger);

    expect(result).toStrictEqual([]);
    expect(getMoneyAccountWithdrawMock).not.toHaveBeenCalled();
  });

  it('returns empty array when money account has no address', async () => {
    selectPrimaryMoneyAccountMock.mockReturnValue({} as never);

    const result = await getPaymentOverrideData(buildRequest(), mockMessenger);

    expect(result).toStrictEqual([]);
  });

  it('returns empty array when withdraw transactions data is empty', async () => {
    getMoneyAccountWithdrawMock.mockResolvedValue([]);

    const result = await getPaymentOverrideData(buildRequest(), mockMessenger);

    expect(result).toStrictEqual([]);
  });

  it('returns empty array when transaction has no from', async () => {
    const result = await getPaymentOverrideData(
      buildRequest({
        transaction: { id: TRANSACTION_ID, txParams: {} } as TransactionMeta,
      }),
      mockMessenger,
    );

    expect(result).toStrictEqual([]);
  });

  it('calls getMoneyAccountWithdrawTransactionsData with Monad chain, amount, and user EOA as recipient', async () => {
    await getPaymentOverrideData(buildRequest(), mockMessenger);

    expect(getMoneyAccountWithdrawMock).toHaveBeenCalledWith(
      CHAIN_IDS.MONAD,
      AMOUNT_HUMAN,
      USER_EOA,
    );
  });

  it('builds TransactionMeta and passes it to getDelegationTransaction', async () => {
    await getPaymentOverrideData(buildRequest(), mockMessenger);

    expect(getDelegationTransactionMock).toHaveBeenCalledWith(
      mockMessenger,
      expect.objectContaining({
        chainId: CHAIN_IDS.MONAD,
        networkClientId: 'mock-network-client-id',
        status: TransactionStatus.unapproved,
        id: expect.stringMatching(/^money-account-withdraw-\d+$/),
        time: expect.any(Number),
        txParams: { from: MONEY_ACCOUNT_ADDRESS },
        nestedTransactions: [
          { to: '0xTeller', data: '0xwithdraw', value: '0x0' },
          { to: '0xMusd', data: '0xtransfer', value: '0x0' },
        ],
      }),
    );
  });

  it('returns BatchTransactionParams array with delegation data', async () => {
    const result = await getPaymentOverrideData(buildRequest(), mockMessenger);

    expect(result).toStrictEqual([
      {
        to: DELEGATION_MANAGER,
        data: DELEGATION_DATA,
        value: '0x0',
      },
    ]);
  });
});
