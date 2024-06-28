import { renderHook, act } from '@testing-library/react-hooks';
import { KeyringTypes } from '@metamask/keyring-controller';
import { toChecksumAddress } from 'ethereumjs-util';
import useAccounts from './useAccounts';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { Account } from './useAccounts.types';

const MOCK_ENS_CACHED_NAME = 'fox.eth';

const MOCK_CHAIN_ID = '0x1';

const MOCK_ACCOUNT_ADDRESSES = Object.values(
  MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts,
).map((account) => account.address);

const MOCK_ACCOUNT_1: Account = {
  name: 'Account 1',
  address: toChecksumAddress(MOCK_ACCOUNT_ADDRESSES[0]),
  type: KeyringTypes.hd,
  yOffset: 0,
  isSelected: false,
  assets: {
    fiatBalance: '\n0 ETH',
  },
  balanceError: undefined,
};
const MOCK_ACCOUNT_2: Account = {
  name: 'Account 2',
  address: toChecksumAddress(MOCK_ACCOUNT_ADDRESSES[1]),
  type: KeyringTypes.hd,
  yOffset: 78,
  isSelected: true,
  assets: {
    fiatBalance: '\n< 0.00001 ETH',
  },
  balanceError: undefined,
};

const MOCK_STORE_STATE = {
  settings: {},
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      AccountTrackerController: {
        accounts: {
          [MOCK_ACCOUNT_1.address]: {
            balance: '0x0',
          },
          [MOCK_ACCOUNT_2.address]: {
            balance: '0x5',
          },
        },
      },
      NetworkController: {
        providerConfig: {
          chainId: MOCK_CHAIN_ID,
        },
      },
    },
  },
};

jest.mock('../../../util/ENSUtils', () => ({
  ...jest.requireActual('../../../util/ENSUtils'),
  doENSReverseLookup: jest
    .fn()
    .mockImplementation((address: string, chainId: string) => {
      const cacheKey = `${chainId}${address}`;
      const MOCK_ENS_CACHE = {
        [`${MOCK_CHAIN_ID}${MOCK_ACCOUNT_1.address}`]: MOCK_ENS_CACHED_NAME,
      };
      return MOCK_ENS_CACHE[cacheKey];
    }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (fn: (state: unknown) => unknown) => fn(MOCK_STORE_STATE),
}));

describe('useAccounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty data if isLoading is true', async () => {
    const { result } = renderHook(() => useAccounts({ isLoading: true }));
    expect(result.current.accounts).toStrictEqual([]);
    expect(result.current.ensByAccountAddress).toStrictEqual({});
  });

  it('populates balanceError property for accounts', async () => {
    const expectedBalanceError = 'Insufficient funds';
    const { result, waitForNextUpdate } = renderHook(() =>
      useAccounts({
        checkBalanceError: (balance) =>
          balance === '0x0' ? 'Insufficient funds' : '',
      }),
    );
    await act(async () => {
      await waitForNextUpdate();
    });
    expect(result.current.accounts[0].balanceError).toStrictEqual(
      expectedBalanceError,
    );
    expect(result.current.accounts[1].balanceError).toStrictEqual('');
  });

  it('returns internal accounts', async () => {
    const expectedInternalAccounts: Account[] = [
      MOCK_ACCOUNT_1,
      MOCK_ACCOUNT_2,
    ];
    const { result, waitForNextUpdate } = renderHook(() => useAccounts());
    await act(async () => {
      await waitForNextUpdate();
    });
    expect(result.current.accounts).toStrictEqual(expectedInternalAccounts);
  });

  it('returns ENS name when available', async () => {
    const expectedENSNames = {
      [MOCK_ACCOUNT_1.address]: MOCK_ENS_CACHED_NAME,
    };
    const { result, waitForNextUpdate } = renderHook(() => useAccounts());
    await act(async () => {
      await waitForNextUpdate();
    });
    expect(result.current.ensByAccountAddress).toStrictEqual(expectedENSNames);
  });
});
