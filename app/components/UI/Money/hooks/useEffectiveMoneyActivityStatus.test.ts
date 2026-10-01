import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import {
  renderHookWithProvider,
  type ProviderValues,
} from '../../../../util/test/renderWithProvider';
import type { MoneyActivityItem } from '../types/moneyActivity';
import {
  resolveEffectiveMoneyActivityStatus,
  useEffectiveMoneyActivityStatus,
  useEffectiveStatusOverrides,
  type FiatOrderSettlement,
} from './useEffectiveMoneyActivityStatus';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getOrder: jest.fn(),
    },
  },
}));

let mockQueryReturn: { data: FiatOrderSettlement | undefined } = {
  data: undefined,
};

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => mockQueryReturn),
  useQueries: jest.fn(
    ({
      queries,
      combine,
    }: {
      queries: { queryFn: () => Promise<FiatOrderSettlement> }[];
      combine: (
        results: { data: FiatOrderSettlement | undefined }[],
      ) => unknown;
    }) => combine(queries.map(() => mockQueryReturn)),
  ),
}));

const getOrderMock = jest.mocked(Engine.context.RampsController.getOrder);

const MONEY_ACCOUNT_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';

function engineState(): ProviderValues['state'] {
  return {
    engine: {
      backgroundState: {
        MoneyAccountController: {
          moneyAccounts: {
            'money-account-1': {
              id: 'money-account-1',
              address: MONEY_ACCOUNT_ADDRESS,
              options: { entropy: { id: 'primary-keyring' } },
            },
          },
        },
        KeyringController: {
          keyrings: [
            {
              type: 'HD Key Tree',
              accounts: [MONEY_ACCOUNT_ADDRESS],
              metadata: { id: 'primary-keyring' },
            },
          ],
        },
      },
    },
  } as ProviderValues['state'];
}

function makeVaultFailureTx(
  overrides: Partial<TransactionMeta> = {},
): TransactionMeta {
  return {
    id: 'tx-1',
    time: 0,
    txParams: { from: MONEY_ACCOUNT_ADDRESS },
    type: TransactionType.moneyAccountDeposit,
    status: TransactionStatus.failed,
    metamaskPay: { fiat: { orderId: 'order-1', provider: 'transak-native' } },
    error: { name: 'forced', message: 'Post-Ramp: Direct mUSD: Vault: forced' },
    ...overrides,
  } as unknown as TransactionMeta;
}

function makeRestartTx(
  overrides: Partial<TransactionMeta> = {},
): TransactionMeta {
  return makeVaultFailureTx({
    error: { name: 'forced', message: 'Transaction incomplete at startup' },
    ...overrides,
  });
}

describe('resolveEffectiveMoneyActivityStatus', () => {
  it('returns confirmed for a vault-only failure regardless of settlement', () => {
    const tx = makeVaultFailureTx();

    expect(resolveEffectiveMoneyActivityStatus(tx, 'unknown')).toBe(
      'confirmed',
    );
  });

  it('returns confirmed for a restart-interrupted deposit whose order settled', () => {
    const tx = makeRestartTx();

    expect(resolveEffectiveMoneyActivityStatus(tx, 'settled')).toBe(
      'confirmed',
    );
  });

  it('returns failed for a restart-interrupted deposit whose order actually failed', () => {
    const tx = makeRestartTx();

    expect(resolveEffectiveMoneyActivityStatus(tx, 'order-failed')).toBe(
      'failed',
    );
  });

  it('returns pending for a restart-interrupted deposit with an unresolved order', () => {
    const tx = makeRestartTx();

    expect(resolveEffectiveMoneyActivityStatus(tx, 'unknown')).toBe('pending');
  });

  it('returns failed unchanged for a failure that is neither vault-only nor restart-interrupted', () => {
    const tx = makeVaultFailureTx({
      error: { name: 'other', message: 'Post-Ramp: order cancelled' },
    });

    expect(resolveEffectiveMoneyActivityStatus(tx, 'unknown')).toBe('failed');
  });

  it('returns confirmed unchanged for an already-confirmed transaction', () => {
    const tx = makeVaultFailureTx({ status: TransactionStatus.confirmed });

    expect(resolveEffectiveMoneyActivityStatus(tx, 'unknown')).toBe(
      'confirmed',
    );
  });
});

describe('useEffectiveMoneyActivityStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryReturn = { data: undefined };
  });

  it('returns confirmed for a vault-only failure without consulting the query result', () => {
    const tx = makeVaultFailureTx();
    mockQueryReturn = { data: 'order-failed' };

    const { result } = renderHookWithProvider(
      () => useEffectiveMoneyActivityStatus(tx),
      { state: engineState() },
    );

    expect(result.current).toBe('confirmed');
  });

  it('returns confirmed for a restart-interrupted deposit once the query reports settled', () => {
    const tx = makeRestartTx();
    mockQueryReturn = { data: 'settled' };

    const { result } = renderHookWithProvider(
      () => useEffectiveMoneyActivityStatus(tx),
      { state: engineState() },
    );

    expect(result.current).toBe('confirmed');
  });

  it('returns pending for a restart-interrupted deposit while the query is unresolved', () => {
    const tx = makeRestartTx();
    mockQueryReturn = { data: undefined };

    const { result } = renderHookWithProvider(
      () => useEffectiveMoneyActivityStatus(tx),
      { state: engineState() },
    );

    expect(result.current).toBe('pending');
  });
});

describe('useEffectiveStatusOverrides', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryReturn = { data: undefined };
  });

  function onchainItem(tx: TransactionMeta): MoneyActivityItem {
    return { kind: 'onchain', id: tx.id, time: tx.time ?? 0, tx };
  }

  it('maps a restart-interrupted deposit to confirmed once settled', () => {
    const tx = makeRestartTx({ id: 'restart-tx' });
    mockQueryReturn = { data: 'settled' };

    const { result } = renderHookWithProvider(
      () => useEffectiveStatusOverrides([onchainItem(tx)]),
      { state: engineState() },
    );

    expect(result.current.get('restart-tx')).toBe('confirmed');
  });

  it('omits transactions that are not restart candidates', () => {
    const confirmedTx = makeVaultFailureTx({
      id: 'confirmed-tx',
      status: TransactionStatus.confirmed,
    });

    const { result } = renderHookWithProvider(
      () => useEffectiveStatusOverrides([onchainItem(confirmedTx)]),
      { state: engineState() },
    );

    expect(result.current.has('confirmed-tx')).toBe(false);
  });

  it('returns an empty map for accountsApi and cardProvider items', () => {
    const apiItem: MoneyActivityItem = {
      kind: 'accountsApi',
      id: '0xhash',
      time: 0,
      tx: {
        kind: 'card',
        hash: '0xhash',
        time: 0,
        chainId: '0x8f',
        token: { address: '0xtoken', symbol: 'mUSD', decimals: 6 },
        amount: '1',
        paidTo: '0xmerchant',
      },
    };

    const { result } = renderHookWithProvider(
      () => useEffectiveStatusOverrides([apiItem]),
      { state: engineState() },
    );

    expect(result.current.size).toBe(0);
  });
});
