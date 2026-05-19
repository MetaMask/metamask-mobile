import type { MoneyAccount } from '@metamask/money-account-controller';
import { MONEY_DERIVATION_PATH } from '@metamask/eth-money-keyring';
import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import {
  renderHookWithProvider,
  type ProviderValues,
} from '../../../../util/test/renderWithProvider';
import {
  MOCK_HD_KEYRING_METADATA,
  MOCK_KEYRING_CONTROLLER,
} from '../../../../selectors/keyringController/testUtils';
import MOCK_MONEY_TRANSACTIONS from '../constants/mockActivityData';
import {
  isMoneyActivityDeposit,
  isMoneyActivityTransfer,
} from '../constants/moneyActivityFilters';
import { useMoneyAccountTransactions } from './useMoneyAccountTransactions';

const MOCK_MONEY_ACCOUNT: MoneyAccount = {
  id: 'account-1',
  address: '0x0000000000000000000000000000000000000abc',
  type: 'eip155:eoa',
  scopes: [],
  methods: [],
  options: {
    entropy: {
      type: 'mnemonic',
      id: MOCK_HD_KEYRING_METADATA.id,
      derivationPath: `${MONEY_DERIVATION_PATH}/0`,
      groupIndex: 0,
    },
    exportable: false,
  },
};

const MONEY_ADDRESS = MOCK_MONEY_ACCOUNT.address as Hex;
const OTHER_ADDRESS: Hex = '0x0000000000000000000000000000000000000def';
const OTHER_ERC20: Hex = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const ERC20_TRANSFER_SELECTOR = '0xa9059cbb';

function padAddress(addr: string): string {
  return addr.replace(/^0x/, '').toLowerCase().padStart(64, '0');
}

function padAmount(amount: bigint): string {
  return amount.toString(16).padStart(64, '0');
}

function makeTransferCalldata(recipient: string, amount = 1_000_000n): string {
  return ERC20_TRANSFER_SELECTOR + padAddress(recipient) + padAmount(amount);
}

function musdTransferInfo(): NonNullable<
  TransactionMeta['transferInformation']
> {
  return {
    amount: '1000000',
    decimals: 6,
    symbol: 'mUSD',
    contractAddress: MUSD_TOKEN_ADDRESS,
  };
}

function otherTransferInfo(): NonNullable<
  TransactionMeta['transferInformation']
> {
  return {
    amount: '1000000',
    decimals: 6,
    symbol: 'USDC',
    contractAddress: OTHER_ERC20,
  };
}

const MOCK_MONEY_ACCOUNTS = {
  [MOCK_MONEY_ACCOUNT.id]: MOCK_MONEY_ACCOUNT,
};

const MOCK_DEPOSITS = MOCK_MONEY_TRANSACTIONS.filter(isMoneyActivityDeposit);
const MOCK_TRANSFERS = MOCK_MONEY_TRANSACTIONS.filter(isMoneyActivityTransfer);

function engineState(
  remoteFeatureFlags: Record<string, unknown>,
  transactions: Partial<TransactionMeta>[] = [],
): ProviderValues['state'] {
  return {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags,
        },
        MoneyAccountController: {
          moneyAccounts: MOCK_MONEY_ACCOUNTS,
        },
        KeyringController: MOCK_KEYRING_CONTROLLER,
        TransactionController: {
          transactions,
        },
      },
    },
  } as ProviderValues['state'];
}

function makeTx(
  type: TransactionType,
  overrides: Partial<TransactionMeta> = {},
): Partial<TransactionMeta> {
  return {
    id: `tx-${type}`,
    chainId: '0x1',
    type,
    status: TransactionStatus.confirmed,
    time: Date.now(),
    ...overrides,
  };
}

describe('useMoneyAccountTransactions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns empty lists when mock data flag is off', () => {
    const { result } = renderHookWithProvider(
      () => useMoneyAccountTransactions(),
      {
        state: engineState({ moneyActivityMockDataEnabled: false }),
      },
    );

    expect(result.current.allTransactions).toEqual([]);
    expect(result.current.deposits).toEqual([]);
    expect(result.current.transfers).toEqual([]);
    expect(result.current.submittedTransactions).toEqual([]);
  });

  it('returns mock activity when remote mock flag is true', () => {
    const { result } = renderHookWithProvider(
      () => useMoneyAccountTransactions(),
      {
        state: engineState({ moneyActivityMockDataEnabled: true }),
      },
    );

    expect(result.current.allTransactions).toEqual(MOCK_MONEY_TRANSACTIONS);
    expect(result.current.deposits).toEqual(MOCK_DEPOSITS);
    expect(result.current.transfers).toEqual(MOCK_TRANSFERS);
    expect(result.current.submittedTransactions).toEqual([]);
  });

  it('falls back to env when remote flag is not a boolean', () => {
    process.env.MM_MONEY_ACTIVITY_MOCK_DATA_ENABLED = 'true';

    const { result } = renderHookWithProvider(
      () => useMoneyAccountTransactions(),
      {
        state: engineState({ moneyActivityMockDataEnabled: 'invalid' }),
      },
    );

    expect(result.current.allTransactions.length).toBe(
      MOCK_MONEY_TRANSACTIONS.length,
    );
  });

  it('exposes checksummed money address from the primary Money account', () => {
    const { result } = renderHookWithProvider(
      () => useMoneyAccountTransactions(),
      {
        state: engineState({ moneyActivityMockDataEnabled: false }),
      },
    );

    expect(result.current.moneyAddress).toBeDefined();
    expect(result.current.moneyAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  describe('real transaction filtering (mock flag off)', () => {
    it('includes direct moneyAccountDeposit transactions', () => {
      const tx = makeTx(TransactionType.moneyAccountDeposit);
      const { result } = renderHookWithProvider(
        () => useMoneyAccountTransactions(),
        { state: engineState({ moneyActivityMockDataEnabled: false }, [tx]) },
      );
      expect(result.current.allTransactions).toHaveLength(1);
      expect(result.current.deposits).toHaveLength(1);
      expect(result.current.transfers).toHaveLength(0);
    });

    it('includes direct moneyAccountWithdraw transactions', () => {
      const tx = makeTx(TransactionType.moneyAccountWithdraw);
      const { result } = renderHookWithProvider(
        () => useMoneyAccountTransactions(),
        { state: engineState({ moneyActivityMockDataEnabled: false }, [tx]) },
      );
      expect(result.current.allTransactions).toHaveLength(1);
      expect(result.current.transfers).toHaveLength(1);
      expect(result.current.deposits).toHaveLength(0);
    });

    it('includes EIP-7702 batch with nested moneyAccountDeposit', () => {
      const tx = makeTx(TransactionType.batch, {
        nestedTransactions: [
          { type: TransactionType.moneyAccountDeposit } as TransactionMeta,
        ],
      });
      const { result } = renderHookWithProvider(
        () => useMoneyAccountTransactions(),
        { state: engineState({ moneyActivityMockDataEnabled: false }, [tx]) },
      );
      expect(result.current.allTransactions).toHaveLength(1);
      expect(result.current.deposits).toHaveLength(1);
    });

    it('includes EIP-7702 batch with nested moneyAccountWithdraw', () => {
      const tx = makeTx(TransactionType.batch, {
        nestedTransactions: [
          { type: TransactionType.moneyAccountWithdraw } as TransactionMeta,
        ],
      });
      const { result } = renderHookWithProvider(
        () => useMoneyAccountTransactions(),
        { state: engineState({ moneyActivityMockDataEnabled: false }, [tx]) },
      );
      expect(result.current.allTransactions).toHaveLength(1);
      expect(result.current.transfers).toHaveLength(1);
    });

    it('excludes unrelated transaction types', () => {
      const tx = makeTx(TransactionType.swap);
      const { result } = renderHookWithProvider(
        () => useMoneyAccountTransactions(),
        { state: engineState({ moneyActivityMockDataEnabled: false }, [tx]) },
      );
      expect(result.current.allTransactions).toHaveLength(0);
    });

    it('includes inbound mUSD landing at the money account', () => {
      const tx = makeTx(TransactionType.incoming, {
        txParams: { from: OTHER_ADDRESS, to: MONEY_ADDRESS } as never,
        transferInformation: musdTransferInfo(),
      });
      const { result } = renderHookWithProvider(
        () => useMoneyAccountTransactions(),
        { state: engineState({ moneyActivityMockDataEnabled: false }, [tx]) },
      );
      expect(result.current.allTransactions).toHaveLength(1);
      expect(result.current.deposits).toHaveLength(1);
    });

    it('excludes inbound mUSD landing at a non-money address', () => {
      const tx = makeTx(TransactionType.incoming, {
        txParams: { from: OTHER_ADDRESS, to: OTHER_ADDRESS } as never,
        transferInformation: musdTransferInfo(),
      });
      const { result } = renderHookWithProvider(
        () => useMoneyAccountTransactions(),
        { state: engineState({ moneyActivityMockDataEnabled: false }, [tx]) },
      );
      expect(result.current.allTransactions).toHaveLength(0);
    });

    it('excludes inbound incoming transfers of non-mUSD ERC-20s', () => {
      const tx = makeTx(TransactionType.incoming, {
        txParams: { from: OTHER_ADDRESS, to: MONEY_ADDRESS } as never,
        transferInformation: otherTransferInfo(),
      });
      const { result } = renderHookWithProvider(
        () => useMoneyAccountTransactions(),
        { state: engineState({ moneyActivityMockDataEnabled: false }, [tx]) },
      );
      expect(result.current.allTransactions).toHaveLength(0);
    });

    it('includes mUSD tokenMethodTransfer whose decoded recipient is the money account', () => {
      const tx = makeTx(TransactionType.tokenMethodTransfer, {
        txParams: {
          from: OTHER_ADDRESS,
          to: MUSD_TOKEN_ADDRESS,
          data: makeTransferCalldata(MONEY_ADDRESS),
        } as never,
      });
      const { result } = renderHookWithProvider(
        () => useMoneyAccountTransactions(),
        { state: engineState({ moneyActivityMockDataEnabled: false }, [tx]) },
      );
      expect(result.current.allTransactions).toHaveLength(1);
      expect(result.current.deposits).toHaveLength(1);
    });

    it('excludes mUSD tokenMethodTransfer whose decoded recipient is not the money account', () => {
      const tx = makeTx(TransactionType.tokenMethodTransfer, {
        txParams: {
          from: OTHER_ADDRESS,
          to: MUSD_TOKEN_ADDRESS,
          data: makeTransferCalldata(OTHER_ADDRESS),
        } as never,
      });
      const { result } = renderHookWithProvider(
        () => useMoneyAccountTransactions(),
        { state: engineState({ moneyActivityMockDataEnabled: false }, [tx]) },
      );
      expect(result.current.allTransactions).toHaveLength(0);
    });

    it('excludes non-mUSD tokenMethodTransfer even when the call recipient is the money account', () => {
      const tx = makeTx(TransactionType.tokenMethodTransfer, {
        txParams: {
          from: OTHER_ADDRESS,
          to: OTHER_ERC20,
          data: makeTransferCalldata(MONEY_ADDRESS),
        } as never,
      });
      const { result } = renderHookWithProvider(
        () => useMoneyAccountTransactions(),
        { state: engineState({ moneyActivityMockDataEnabled: false }, [tx]) },
      );
      expect(result.current.allTransactions).toHaveLength(0);
    });

    it('excludes mUSD tokenMethodTransfer with malformed calldata', () => {
      const tx = makeTx(TransactionType.tokenMethodTransfer, {
        txParams: {
          from: OTHER_ADDRESS,
          to: MUSD_TOKEN_ADDRESS,
          data: '0xa9059cbb', // selector only, no recipient/amount
        } as never,
      });
      const { result } = renderHookWithProvider(
        () => useMoneyAccountTransactions(),
        { state: engineState({ moneyActivityMockDataEnabled: false }, [tx]) },
      );
      expect(result.current.allTransactions).toHaveLength(0);
    });

    it('sorts correctly when one transaction has an undefined time (covers ?? 0 fallback)', () => {
      const older = makeTx(TransactionType.moneyAccountDeposit, {
        id: 'tx-older',
        time: 1000,
      });
      const noTime = makeTx(TransactionType.moneyAccountWithdraw, {
        id: 'tx-no-time',
        time: undefined,
      });
      const { result } = renderHookWithProvider(
        () => useMoneyAccountTransactions(),
        {
          state: engineState({ moneyActivityMockDataEnabled: false }, [
            noTime,
            older,
          ]),
        },
      );
      // Both transactions should be included; the one with a real timestamp
      // sorts before the one with undefined time (which sorts as 0).
      expect(result.current.allTransactions).toHaveLength(2);
      expect(result.current.allTransactions[0].id).toBe('tx-older');
      expect(result.current.allTransactions[1].id).toBe('tx-no-time');
    });
  });
});
