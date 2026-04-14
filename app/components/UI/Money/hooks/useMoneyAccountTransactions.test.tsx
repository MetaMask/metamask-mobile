import type { MoneyAccount } from '@metamask/money-account-controller';
import { MONEY_DERIVATION_PATH } from '@metamask/eth-money-keyring';
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

const MOCK_MONEY_ACCOUNTS = {
  [MOCK_MONEY_ACCOUNT.id]: MOCK_MONEY_ACCOUNT,
};

const MOCK_DEPOSITS = MOCK_MONEY_TRANSACTIONS.filter(isMoneyActivityDeposit);
const MOCK_TRANSFERS = MOCK_MONEY_TRANSACTIONS.filter(isMoneyActivityTransfer);

function engineState(
  remoteFeatureFlags: Record<string, unknown>,
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
      },
    },
  } as ProviderValues['state'];
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
});
