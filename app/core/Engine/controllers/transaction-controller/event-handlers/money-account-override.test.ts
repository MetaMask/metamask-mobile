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
      NetworkController: {
        findNetworkClientIdByChainId: jest.fn(
          (chainId: string) => `client-${chainId}`,
        ),
        state: {
          networkConfigurationsByChainId: {
            '0x1': {},
            '0x89': {},
          },
        },
      },
      AccountTrackerController: {
        refresh: jest.fn(),
      },
      TokenBalancesController: {
        updateBalances: jest.fn(),
      },
    },
  },
}));

let mockPrimaryMoneyAccount: { address: string } | undefined;
jest.mock('../../../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: () => ({
        engine: { backgroundState: {} },
      }),
    },
  },
}));
jest.mock('../../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: () => mockPrimaryMoneyAccount,
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
const findNetworkClientIdByChainIdMock = jest.mocked(
  Engine.context.NetworkController.findNetworkClientIdByChainId,
);
const accountTrackerRefreshMock = jest.mocked(
  Engine.context.AccountTrackerController.refresh,
);
const tokenBalancesUpdateMock = jest.mocked(
  Engine.context.TokenBalancesController.updateBalances,
);

const PRIMARY_MONEY_ACCOUNT_ADDRESS =
  '0xabc1111111111111111111111111111111111111';

describe('money-account-override', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Engine.context.TransactionPayController.state = { transactionData: {} };
    Engine.context.NetworkController.state = {
      networkConfigurationsByChainId: { '0x1': {}, '0x89': {} },
    } as never;
    getSelectedAccountMock.mockReturnValue(evmAccountMock);
    mockPrimaryMoneyAccount = undefined;
  });

  describe('handleUnapprovedTransactionAddedForMoneyAccount', () => {
    it('sets accountOverride and isQuoteRequired for a moneyAccountDeposit transaction', () => {
      handleUnapprovedTransactionAddedForMoneyAccount(buildTransactionMeta());

      expect(setTransactionConfigMock).toHaveBeenCalledWith(
        TRANSACTION_ID_MOCK,
        expect.any(Function),
      );

      const callback = setTransactionConfigMock.mock.calls[0][1];
      const config: { accountOverride?: string; isQuoteRequired?: boolean } =
        {};
      callback(config as never);

      expect(config.accountOverride).toBe(EVM_ADDRESS_MOCK);
      expect(config.isQuoteRequired).toBe(true);
    });

    it('does not set isQuoteRequired when transaction is postQuote', () => {
      handleUnapprovedTransactionAddedForMoneyAccount(
        buildTransactionMeta({
          metamaskPay: { isPostQuote: true },
        } as never),
      );

      const callback = setTransactionConfigMock.mock.calls[0][1];
      const config: { accountOverride?: string; isQuoteRequired?: boolean } =
        {};
      callback(config as never);

      expect(config.accountOverride).toBe(EVM_ADDRESS_MOCK);
      expect(config.isQuoteRequired).toBeUndefined();
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

    it('calls replaceAccountInNestedTransactions for a batch containing a nested moneyAccountWithdraw', () => {
      const nestedTransactions = [
        { type: TransactionType.tokenMethodApprove },
        { type: TransactionType.moneyAccountWithdraw },
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

    it('does not call replaceAccountInNestedTransactions for a moneyAccountDeposit transaction', () => {
      handleUnapprovedTransactionAddedForMoneyAccount(buildTransactionMeta());

      expect(replaceAccountInNestedTransactionsMock).not.toHaveBeenCalled();
    });

    it('does not call replaceAccountInNestedTransactions for a batch containing only a nested moneyAccountDeposit', () => {
      handleUnapprovedTransactionAddedForMoneyAccount(
        buildTransactionMeta({
          type: TransactionType.batch,
          nestedTransactions: [
            { type: TransactionType.tokenMethodApprove },
            { type: TransactionType.moneyAccountDeposit },
          ],
        } as never),
      );

      expect(replaceAccountInNestedTransactionsMock).not.toHaveBeenCalled();
    });

    it('does not call replaceAccountInNestedTransactions when transaction is skipped', () => {
      handleUnapprovedTransactionAddedForMoneyAccount(
        buildTransactionMeta({ type: TransactionType.simpleSend }),
      );

      expect(replaceAccountInNestedTransactionsMock).not.toHaveBeenCalled();
    });

    describe('balance refresh on override', () => {
      it('refreshes native balances across all configured chains', () => {
        handleUnapprovedTransactionAddedForMoneyAccount(
          buildTransactionMeta({ chainId: '0x1' as never }),
        );

        expect(findNetworkClientIdByChainIdMock).toHaveBeenCalledWith('0x1');
        expect(findNetworkClientIdByChainIdMock).toHaveBeenCalledWith('0x89');
        expect(accountTrackerRefreshMock).toHaveBeenCalledWith([
          'client-0x1',
          'client-0x89',
        ]);
      });

      it('refreshes token balances across all configured chains', () => {
        handleUnapprovedTransactionAddedForMoneyAccount(
          buildTransactionMeta({ chainId: '0x1' as never }),
        );

        expect(tokenBalancesUpdateMock).toHaveBeenCalledWith({
          chainIds: ['0x1', '0x89'],
        });
      });

      it('skips chains where findNetworkClientIdByChainId throws', () => {
        findNetworkClientIdByChainIdMock.mockImplementation((chainId) => {
          if (chainId === '0x89') throw new Error('not configured');
          return `client-${chainId}`;
        });

        handleUnapprovedTransactionAddedForMoneyAccount(
          buildTransactionMeta({ chainId: '0x1' as never }),
        );

        expect(accountTrackerRefreshMock).toHaveBeenCalledWith(['client-0x1']);
      });

      it('does not call refresh when no network clients resolve', () => {
        findNetworkClientIdByChainIdMock.mockImplementation(() => {
          throw new Error('not configured');
        });

        handleUnapprovedTransactionAddedForMoneyAccount(
          buildTransactionMeta({ chainId: '0x1' as never }),
        );

        expect(accountTrackerRefreshMock).not.toHaveBeenCalled();
      });

      it('does not refresh when transaction is skipped', () => {
        handleUnapprovedTransactionAddedForMoneyAccount(
          buildTransactionMeta({ type: TransactionType.simpleSend }),
        );

        expect(accountTrackerRefreshMock).not.toHaveBeenCalled();
        expect(tokenBalancesUpdateMock).not.toHaveBeenCalled();
      });

      it('tolerates TokenBalancesController.updateBalances throwing', () => {
        tokenBalancesUpdateMock.mockImplementation(() => {
          throw new Error('fail');
        });

        expect(() =>
          handleUnapprovedTransactionAddedForMoneyAccount(
            buildTransactionMeta({ chainId: '0x1' as never }),
          ),
        ).not.toThrow();
      });
    });

    describe('card-link approve matcher (MMM_CARD origin)', () => {
      it('sets accountOverride when origin is MMM_CARD and from matches the primary money account', () => {
        mockPrimaryMoneyAccount = { address: PRIMARY_MONEY_ACCOUNT_ADDRESS };

        handleUnapprovedTransactionAddedForMoneyAccount(
          buildTransactionMeta({
            type: TransactionType.tokenMethodApprove,
            origin: 'MetaMask Mobile Card',
            txParams: { from: PRIMARY_MONEY_ACCOUNT_ADDRESS } as never,
          }),
        );

        expect(setTransactionConfigMock).toHaveBeenCalledWith(
          TRANSACTION_ID_MOCK,
          expect.any(Function),
        );

        const callback = setTransactionConfigMock.mock.calls[0][1];
        const config: { accountOverride?: string; isQuoteRequired?: boolean } =
          {};
        callback(config as never);
        expect(config.accountOverride).toBe(EVM_ADDRESS_MOCK);
        expect(config.isQuoteRequired).toBe(true);
      });

      it('does NOT call replaceAccountInNestedTransactions for the card-link approve (single tx, no nested)', () => {
        mockPrimaryMoneyAccount = { address: PRIMARY_MONEY_ACCOUNT_ADDRESS };

        handleUnapprovedTransactionAddedForMoneyAccount(
          buildTransactionMeta({
            type: TransactionType.tokenMethodApprove,
            origin: 'MetaMask Mobile Card',
            txParams: { from: PRIMARY_MONEY_ACCOUNT_ADDRESS } as never,
          }),
        );

        expect(replaceAccountInNestedTransactionsMock).not.toHaveBeenCalled();
      });

      it('does nothing when origin is MMM_CARD but from differs from the primary money account', () => {
        mockPrimaryMoneyAccount = { address: PRIMARY_MONEY_ACCOUNT_ADDRESS };

        handleUnapprovedTransactionAddedForMoneyAccount(
          buildTransactionMeta({
            type: TransactionType.tokenMethodApprove,
            origin: 'MetaMask Mobile Card',
            txParams: { from: '0xdeadbeef' } as never,
          }),
        );

        expect(setTransactionConfigMock).not.toHaveBeenCalled();
      });

      it('does nothing when from matches the primary money account but origin is not MMM_CARD (regression guard)', () => {
        mockPrimaryMoneyAccount = { address: PRIMARY_MONEY_ACCOUNT_ADDRESS };

        handleUnapprovedTransactionAddedForMoneyAccount(
          buildTransactionMeta({
            type: TransactionType.tokenMethodApprove,
            origin: 'some-other-dapp',
            txParams: { from: PRIMARY_MONEY_ACCOUNT_ADDRESS } as never,
          }),
        );

        expect(setTransactionConfigMock).not.toHaveBeenCalled();
      });

      it('matches case-insensitively against the primary money account address', () => {
        mockPrimaryMoneyAccount = {
          address: PRIMARY_MONEY_ACCOUNT_ADDRESS.toUpperCase(),
        };

        handleUnapprovedTransactionAddedForMoneyAccount(
          buildTransactionMeta({
            type: TransactionType.tokenMethodApprove,
            origin: 'MetaMask Mobile Card',
            txParams: {
              from: PRIMARY_MONEY_ACCOUNT_ADDRESS.toLowerCase(),
            } as never,
          }),
        );

        expect(setTransactionConfigMock).toHaveBeenCalled();
      });

      it('does nothing when there is no primary money account at all', () => {
        mockPrimaryMoneyAccount = undefined;

        handleUnapprovedTransactionAddedForMoneyAccount(
          buildTransactionMeta({
            type: TransactionType.tokenMethodApprove,
            origin: 'MetaMask Mobile Card',
            txParams: { from: PRIMARY_MONEY_ACCOUNT_ADDRESS } as never,
          }),
        );

        expect(setTransactionConfigMock).not.toHaveBeenCalled();
      });
    });
  });
});
