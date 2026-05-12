import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { EthAccountType, SolAccountType } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';

import Engine from '../../../../Engine';
import { replaceAccountInNestedTransactions } from '../../../../../components/Views/confirmations/utils/transaction-pay';
import { handleUnapprovedTransactionAddedForMoneyAccount } from './money-account-override';

jest.mock('../../../../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      TransactionPayController: {
        state: { transactionData: {} },
        setTransactionConfig: jest.fn(),
      },
      AccountsController: {
        getSelectedAccount: jest.fn(),
      },
    },
  },
}));

jest.mock(
  '../../../../../components/Views/confirmations/utils/transaction-pay',
  () => ({
    replaceAccountInNestedTransactions: jest.fn(),
  }),
);

const TRANSACTION_ID_MOCK = 'tx-1';
const EVM_ADDRESS_MOCK = '0xabc0000000000000000000000000000000000001';

const buildTransactionMeta = (
  overrides: Partial<TransactionMeta> = {},
): TransactionMeta =>
  ({
    id: TRANSACTION_ID_MOCK,
    type: TransactionType.moneyAccountDeposit,
    txParams: { from: '0x123' },
    ...overrides,
  }) as TransactionMeta;

const evmAccountMock = {
  address: EVM_ADDRESS_MOCK,
  type: EthAccountType.Eoa,
} as unknown as InternalAccount;

const solanaAccountMock = {
  address: 'SoLaNaAddReSs',
  type: SolAccountType.DataAccount,
} as unknown as InternalAccount;

const setTransactionConfigMock = jest.mocked(
  Engine.context.TransactionPayController.setTransactionConfig,
);
const getSelectedAccountMock = jest.mocked(
  Engine.context.AccountsController.getSelectedAccount,
);
const replaceAccountInNestedTransactionsMock = jest.mocked(
  replaceAccountInNestedTransactions,
);

describe('money-account-override', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Engine.context.TransactionPayController.state = { transactionData: {} };
    getSelectedAccountMock.mockReturnValue(evmAccountMock);
  });

  describe('handleUnapprovedTransactionAddedForMoneyAccount', () => {
    it('sets accountOverride for a moneyAccountDeposit transaction', () => {
      handleUnapprovedTransactionAddedForMoneyAccount(buildTransactionMeta());

      expect(setTransactionConfigMock).toHaveBeenCalledWith(
        TRANSACTION_ID_MOCK,
        expect.any(Function),
      );

      const callback = setTransactionConfigMock.mock.calls[0][1];
      const config: { accountOverride?: string } = {};
      callback(config as never);

      expect(config.accountOverride).toBe(EVM_ADDRESS_MOCK);
    });

    it('sets accountOverride for a moneyAccountWithdraw transaction', () => {
      handleUnapprovedTransactionAddedForMoneyAccount(
        buildTransactionMeta({ type: TransactionType.moneyAccountWithdraw }),
      );

      expect(setTransactionConfigMock).toHaveBeenCalled();
    });

    it('sets accountOverride for a batch transaction containing a money-account nested tx', () => {
      handleUnapprovedTransactionAddedForMoneyAccount(
        buildTransactionMeta({
          type: TransactionType.batch,
          nestedTransactions: [
            { type: TransactionType.tokenMethodApprove },
            { type: TransactionType.moneyAccountDeposit },
          ],
        } as never),
      );

      expect(setTransactionConfigMock).toHaveBeenCalledWith(
        TRANSACTION_ID_MOCK,
        expect.any(Function),
      );
    });

    it('does nothing for non-money-account transactions', () => {
      handleUnapprovedTransactionAddedForMoneyAccount(
        buildTransactionMeta({ type: TransactionType.simpleSend }),
      );

      expect(setTransactionConfigMock).not.toHaveBeenCalled();
    });

    it('does nothing when transaction type is missing', () => {
      handleUnapprovedTransactionAddedForMoneyAccount(
        buildTransactionMeta({ type: undefined }),
      );

      expect(setTransactionConfigMock).not.toHaveBeenCalled();
    });

    it('does nothing when an accountOverride is already set', () => {
      Engine.context.TransactionPayController.state = {
        transactionData: {
          [TRANSACTION_ID_MOCK]: {
            accountOverride: '0xexisting',
          },
        },
      } as never;

      handleUnapprovedTransactionAddedForMoneyAccount(buildTransactionMeta());

      expect(setTransactionConfigMock).not.toHaveBeenCalled();
    });

    it('does nothing when the selected account is non-EVM', () => {
      getSelectedAccountMock.mockReturnValue(solanaAccountMock);

      handleUnapprovedTransactionAddedForMoneyAccount(buildTransactionMeta());

      expect(setTransactionConfigMock).not.toHaveBeenCalled();
    });

    it('does nothing when no account is selected', () => {
      getSelectedAccountMock.mockReturnValue(
        undefined as unknown as InternalAccount,
      );

      handleUnapprovedTransactionAddedForMoneyAccount(buildTransactionMeta());

      expect(setTransactionConfigMock).not.toHaveBeenCalled();
    });

    it('replaces the previous account in nested transactions for a money-account deposit batch', () => {
      const nestedTransactions = [
        { type: TransactionType.tokenMethodApprove },
        { type: TransactionType.moneyAccountDeposit },
      ];

      handleUnapprovedTransactionAddedForMoneyAccount(
        buildTransactionMeta({
          type: TransactionType.batch,
          nestedTransactions,
        } as never),
      );

      expect(replaceAccountInNestedTransactionsMock).toHaveBeenCalledWith({
        transactionId: TRANSACTION_ID_MOCK,
        nestedTransactions,
        oldAddress: '0x123',
        newAddress: EVM_ADDRESS_MOCK,
      });
    });

    it('calls replaceAccountInNestedTransactions for a moneyAccountWithdraw transaction', () => {
      handleUnapprovedTransactionAddedForMoneyAccount(
        buildTransactionMeta({ type: TransactionType.moneyAccountWithdraw }),
      );

      expect(replaceAccountInNestedTransactionsMock).toHaveBeenCalledWith({
        transactionId: TRANSACTION_ID_MOCK,
        nestedTransactions: undefined,
        oldAddress: '0x123',
        newAddress: EVM_ADDRESS_MOCK,
      });
    });

    it('does not call replaceAccountInNestedTransactions when transaction is skipped', () => {
      handleUnapprovedTransactionAddedForMoneyAccount(
        buildTransactionMeta({ type: TransactionType.simpleSend }),
      );

      expect(replaceAccountInNestedTransactionsMock).not.toHaveBeenCalled();
    });
  });
});
