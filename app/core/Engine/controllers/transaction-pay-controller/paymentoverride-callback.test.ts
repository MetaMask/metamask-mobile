import { CHAIN_IDS, TransactionStatus } from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import type { Hex } from '@metamask/utils';
import { getMoneyAccountWithdrawTransactionsData } from '../../../../components/UI/Money/utils/moneyAccountTransactions';
import ReduxService from '../../../../core/redux/ReduxService';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectTransactionDataByTransactionId } from '../../../../selectors/transactionPayController';
import { getDelegationTransaction } from '../../../../util/transactions/delegation';
import { getPaymentOverrideData } from './paymentoverride-callback';

jest.mock('../../../../components/UI/Money/utils/moneyAccountTransactions');
jest.mock('../../../../core/redux/ReduxService', () => ({
  __esModule: true,
  default: { store: { getState: jest.fn().mockReturnValue({}) } },
}));
jest.mock('../../../../selectors/transactionPayController');
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
      TransactionController: {
        state: {
          transactions: [{ id: TRANSACTION_ID, txParams: { from: USER_EOA } }],
        },
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

const VALID_TX_DATA = {
  paymentOverride: PaymentOverride.MoneyAccount,
  tokens: [{ chainId: '0x8f' as Hex, amountHuman: AMOUNT_HUMAN }],
};

const mockMessenger = {} as never;

const selectTransactionDataMock = jest.mocked(
  selectTransactionDataByTransactionId,
);
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

  it('returns undefined when paymentOverride is not MoneyAccount', async () => {
    selectTransactionDataMock.mockReturnValue({
      ...VALID_TX_DATA,
      paymentOverride: undefined,
    } as never);

    const result = await getPaymentOverrideData(
      TRANSACTION_ID,
      mockMessenger,
      AMOUNT_HUMAN,
    );

    expect(result).toBeUndefined();
    expect(getMoneyAccountWithdrawMock).not.toHaveBeenCalled();
  });

  it('returns undefined when transaction data is undefined', async () => {
    selectTransactionDataMock.mockReturnValue(undefined as never);

    const result = await getPaymentOverrideData(
      TRANSACTION_ID,
      mockMessenger,
      AMOUNT_HUMAN,
    );

    expect(result).toBeUndefined();
  });

  it('returns undefined when primary money account is missing', async () => {
    selectTransactionDataMock.mockReturnValue(VALID_TX_DATA as never);
    selectPrimaryMoneyAccountMock.mockReturnValue(undefined);

    const result = await getPaymentOverrideData(
      TRANSACTION_ID,
      mockMessenger,
      AMOUNT_HUMAN,
    );

    expect(result).toBeUndefined();
    expect(getMoneyAccountWithdrawMock).not.toHaveBeenCalled();
  });

  it('returns undefined when money account has no address', async () => {
    selectTransactionDataMock.mockReturnValue(VALID_TX_DATA as never);
    selectPrimaryMoneyAccountMock.mockReturnValue({} as never);

    const result = await getPaymentOverrideData(
      TRANSACTION_ID,
      mockMessenger,
      AMOUNT_HUMAN,
    );

    expect(result).toBeUndefined();
  });

  it('returns undefined when withdraw transactions data is empty', async () => {
    selectTransactionDataMock.mockReturnValue(VALID_TX_DATA as never);
    getMoneyAccountWithdrawMock.mockResolvedValue([]);

    const result = await getPaymentOverrideData(
      TRANSACTION_ID,
      mockMessenger,
      AMOUNT_HUMAN,
    );

    expect(result).toBeUndefined();
  });

  it('calls getMoneyAccountWithdrawTransactionsData with Monad chain, amount, and user EOA as recipient', async () => {
    selectTransactionDataMock.mockReturnValue(VALID_TX_DATA as never);

    await getPaymentOverrideData(TRANSACTION_ID, mockMessenger, AMOUNT_HUMAN);

    expect(getMoneyAccountWithdrawMock).toHaveBeenCalledWith(
      CHAIN_IDS.MONAD,
      AMOUNT_HUMAN,
      USER_EOA,
    );
  });

  it('builds TransactionMeta and passes it to getDelegationTransaction', async () => {
    selectTransactionDataMock.mockReturnValue(VALID_TX_DATA as never);

    await getPaymentOverrideData(TRANSACTION_ID, mockMessenger, AMOUNT_HUMAN);

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

  it('returns TransactionParams with delegation data and money account from', async () => {
    selectTransactionDataMock.mockReturnValue(VALID_TX_DATA as never);

    const result = await getPaymentOverrideData(
      TRANSACTION_ID,
      mockMessenger,
      AMOUNT_HUMAN,
    );

    expect(result).toStrictEqual({
      from: MONEY_ACCOUNT_ADDRESS,
      to: DELEGATION_MANAGER,
      data: DELEGATION_DATA,
      value: '0x0',
    });
  });
});
