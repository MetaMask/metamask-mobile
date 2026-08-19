import {
  CHAIN_IDS,
  TransactionStatus,
  type AuthorizationList,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import {
  PaymentOverride,
  type GetPaymentOverrideDataRequest,
} from '@metamask/transaction-pay-controller';
import type { Hex } from '@metamask/utils';
import {
  buildMoneyAccountDepositBatch,
  buildMoneyAccountWithdrawBatch,
} from '../../../../components/UI/Money/utils/moneyAccountTransactions';
import ReduxService from '../../../../core/redux/ReduxService';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import { calcTokenValue } from '../../../../util/transactions';
import { getDelegationTransaction } from '../../../../util/transactions/delegation';
import { getPaymentOverrideData } from './paymentoverride-callback';

jest.mock('../../../../components/UI/Money/utils/moneyAccountTransactions');
jest.mock('../../../../components/UI/Earn/constants/musd', () => ({
  MUSD_DECIMALS: 18,
}));
jest.mock('../../../../core/redux/ReduxService', () => ({
  __esModule: true,
  default: { store: { getState: jest.fn().mockReturnValue({}) } },
}));
jest.mock('../../../../selectors/featureFlagController/moneyAccount');
jest.mock('../../../../selectors/moneyAccountController');
jest.mock('../../../../util/notifications/methods/common');
jest.mock('../../../../util/transactions');
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
const MOCK_AUTHORIZATION_LIST = [
  { chainId: '0x1' as Hex, nonce: '0x2' as Hex, yParity: '0x1' as Hex },
];

const MOCK_VAULT_CONFIG = {
  tellerAddress: '0xTeller',
  accountantAddress: '0xAccountant',
  boringVault: '0xBoringVault',
  lensAddress: '0xLens',
};

const MOCK_PROVIDER = {} as never;

const MOCK_WITHDRAW_BATCH = {
  withdrawTx: {
    params: {
      to: '0xTeller' as Hex,
      data: '0xwithdraw' as Hex,
      value: '0x0' as Hex,
    },
  },
  transferTx: {
    params: {
      to: '0xMusd' as Hex,
      data: '0xtransfer' as Hex,
      value: '0x0' as Hex,
    },
  },
};

const MOCK_DEPOSIT_BATCH = {
  approveTx: {
    params: {
      to: '0xMusd' as Hex,
      data: '0xapprove' as Hex,
      value: '0x0' as Hex,
    },
  },
  depositTx: {
    params: {
      to: '0xTeller' as Hex,
      data: '0xdeposit' as Hex,
      value: '0x0' as Hex,
    },
  },
};

const AMOUNT_HUMAN = '10.5';
const MOCK_AMOUNT_RAW = '10500000';

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
const selectMoneyAccountVaultConfigMock = jest.mocked(
  selectMoneyAccountVaultConfig,
);
const getProviderByChainIdMock = jest.mocked(getProviderByChainId);
const calcTokenValueMock = jest.mocked(calcTokenValue);
const buildMoneyAccountWithdrawBatchMock = jest.mocked(
  buildMoneyAccountWithdrawBatch,
);
const buildMoneyAccountDepositBatchMock = jest.mocked(
  buildMoneyAccountDepositBatch,
);
const getDelegationTransactionMock = jest.mocked(getDelegationTransaction);

describe('getPaymentOverrideData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ReduxService.store.getState as jest.Mock).mockReturnValue({});
    selectPrimaryMoneyAccountMock.mockReturnValue({
      address: MONEY_ACCOUNT_ADDRESS,
    } as never);
    selectMoneyAccountVaultConfigMock.mockReturnValue(
      MOCK_VAULT_CONFIG as never,
    );
    getProviderByChainIdMock.mockReturnValue(MOCK_PROVIDER);
    calcTokenValueMock.mockReturnValue({
      decimalPlaces: jest.fn().mockReturnValue({
        toFixed: jest.fn().mockReturnValue(MOCK_AMOUNT_RAW),
      }),
    } as never);
    buildMoneyAccountWithdrawBatchMock.mockResolvedValue(
      MOCK_WITHDRAW_BATCH as never,
    );
    buildMoneyAccountDepositBatchMock.mockResolvedValue(
      MOCK_DEPOSIT_BATCH as never,
    );
    getDelegationTransactionMock.mockResolvedValue({
      authorizationList: MOCK_AUTHORIZATION_LIST as AuthorizationList,
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

    expect(result).toStrictEqual({ calls: [] });
    expect(buildMoneyAccountWithdrawBatchMock).not.toHaveBeenCalled();
  });

  it('returns empty array when transaction data is undefined', async () => {
    const result = await getPaymentOverrideData(
      buildRequest({
        transactionData:
          undefined as unknown as GetPaymentOverrideDataRequest['transactionData'],
      }),
      mockMessenger,
    );

    expect(result).toStrictEqual({ calls: [] });
  });

  it('returns empty array when primary money account is missing', async () => {
    selectPrimaryMoneyAccountMock.mockReturnValue(undefined);

    const result = await getPaymentOverrideData(buildRequest(), mockMessenger);

    expect(result).toStrictEqual({ calls: [] });
    expect(buildMoneyAccountWithdrawBatchMock).not.toHaveBeenCalled();
  });

  it('returns empty array when money account has no address', async () => {
    selectPrimaryMoneyAccountMock.mockReturnValue({} as never);

    const result = await getPaymentOverrideData(buildRequest(), mockMessenger);

    expect(result).toStrictEqual({ calls: [] });
  });

  it('returns empty array when vault config is missing', async () => {
    selectMoneyAccountVaultConfigMock.mockReturnValue(undefined as never);

    const result = await getPaymentOverrideData(buildRequest(), mockMessenger);

    expect(result).toStrictEqual({ calls: [] });
  });

  it('returns empty array when transaction has no from', async () => {
    const result = await getPaymentOverrideData(
      buildRequest({
        transaction: { id: TRANSACTION_ID, txParams: {} } as TransactionMeta,
      }),
      mockMessenger,
    );

    expect(result).toStrictEqual({ calls: [] });
  });

  it('calls buildMoneyAccountWithdrawBatch with correct params', async () => {
    await getPaymentOverrideData(buildRequest(), mockMessenger);

    expect(buildMoneyAccountWithdrawBatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: BigInt(MOCK_AMOUNT_RAW),
        chainId: CHAIN_IDS.MONAD,
        tellerAddress: MOCK_VAULT_CONFIG.tellerAddress,
        accountantAddress: MOCK_VAULT_CONFIG.accountantAddress,
        moneyAccountAddress: MONEY_ACCOUNT_ADDRESS,
        recipient: USER_EOA,
      }),
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

    expect(result).toStrictEqual({
      calls: [
        {
          to: DELEGATION_MANAGER,
          data: DELEGATION_DATA,
          value: '0x0',
        },
      ],
    });
  });

  describe('non-atomic withdraw path', () => {
    function buildNonAtomicRequest(
      overrides?: Partial<GetPaymentOverrideDataRequest>,
    ): GetPaymentOverrideDataRequest {
      return buildRequest({
        transactionData: {
          ...VALID_TX_DATA,
          atomic: false,
        } as GetPaymentOverrideDataRequest['transactionData'],
        ...overrides,
      });
    }

    it('returns raw withdraw and transfer calls without delegation wrap', async () => {
      const result = await getPaymentOverrideData(
        buildNonAtomicRequest(),
        mockMessenger,
      );

      expect(result).toStrictEqual({
        calls: [
          { to: '0xTeller', data: '0xwithdraw', value: '0x0' },
          { to: '0xMusd', data: '0xtransfer', value: '0x0' },
        ],
      });
    });

    it('does not call getDelegationTransaction on non-atomic path', async () => {
      await getPaymentOverrideData(buildNonAtomicRequest(), mockMessenger);

      expect(getDelegationTransactionMock).not.toHaveBeenCalled();
    });
  });

  describe('isPostQuote deposit path', () => {
    function buildPostQuoteRequest(
      overrides?: Partial<GetPaymentOverrideDataRequest>,
    ): GetPaymentOverrideDataRequest {
      return buildRequest({
        transactionData: {
          ...VALID_TX_DATA,
          isPostQuote: true,
        } as GetPaymentOverrideDataRequest['transactionData'],
        ...overrides,
      });
    }

    it('calls buildMoneyAccountDepositBatch with correct params', async () => {
      await getPaymentOverrideData(buildPostQuoteRequest(), mockMessenger);

      expect(buildMoneyAccountDepositBatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: BigInt(MOCK_AMOUNT_RAW),
          chainId: CHAIN_IDS.MONAD,
          boringVault: MOCK_VAULT_CONFIG.boringVault,
          tellerAddress: MOCK_VAULT_CONFIG.tellerAddress,
          accountantAddress: MOCK_VAULT_CONFIG.accountantAddress,
          lensAddress: MOCK_VAULT_CONFIG.lensAddress,
        }),
      );
    });

    it('does not call withdraw functions', async () => {
      await getPaymentOverrideData(buildPostQuoteRequest(), mockMessenger);

      expect(buildMoneyAccountWithdrawBatchMock).not.toHaveBeenCalled();
    });

    it('returns deposit transaction params with delegation data', async () => {
      const result = await getPaymentOverrideData(
        buildPostQuoteRequest(),
        mockMessenger,
      );

      expect(result).toStrictEqual({
        recipient: MONEY_ACCOUNT_ADDRESS,
        authorizationList: MOCK_AUTHORIZATION_LIST,
        calls: [
          {
            to: DELEGATION_MANAGER,
            data: DELEGATION_DATA,
            value: '0x0',
          },
        ],
      });
    });

    it('returns empty object when vault config is missing', async () => {
      selectMoneyAccountVaultConfigMock.mockReturnValue(undefined as never);

      const result = await getPaymentOverrideData(
        buildPostQuoteRequest(),
        mockMessenger,
      );

      expect(result).toStrictEqual({ calls: [] });
    });

    describe('non-atomic deposit path', () => {
      function buildNonAtomicPostQuoteRequest(
        overrides?: Partial<GetPaymentOverrideDataRequest>,
      ): GetPaymentOverrideDataRequest {
        return buildRequest({
          transactionData: {
            ...VALID_TX_DATA,
            isPostQuote: true,
            atomic: false,
          } as GetPaymentOverrideDataRequest['transactionData'],
          ...overrides,
        });
      }

      it('returns raw approve and deposit calls with recipient but without delegation wrap', async () => {
        const result = await getPaymentOverrideData(
          buildNonAtomicPostQuoteRequest(),
          mockMessenger,
        );

        expect(result).toStrictEqual({
          recipient: MONEY_ACCOUNT_ADDRESS,
          calls: [
            { to: '0xMusd', data: '0xapprove', value: '0x0' },
            { to: '0xTeller', data: '0xdeposit', value: '0x0' },
          ],
        });
      });

      it('does not call getDelegationTransaction on non-atomic path', async () => {
        await getPaymentOverrideData(
          buildNonAtomicPostQuoteRequest(),
          mockMessenger,
        );

        expect(getDelegationTransactionMock).not.toHaveBeenCalled();
      });
    });
  });
});
