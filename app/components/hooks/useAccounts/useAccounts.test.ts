import { renderHook, act } from '@testing-library/react-hooks';
import { KeyringTypes } from '@metamask/keyring-controller';
import { EthScope } from '@metamask/keyring-api';
import useAccounts from './useAccounts';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { Account } from './useAccounts.types';
import { toChecksumAddress } from '../../../util/address';

jest.mock('../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: jest.fn().mockReturnValue({
    ethFiat: 0,
    ethFiat1dAgo: 0,
    tokenFiat: 0,
    tokenFiat1dAgo: 0,
    totalNativeTokenBalance: '0',
    ticker: 'ETH',
  }),
}));

const MOCK_ENS_CACHED_NAME = 'fox.eth';

const MOCK_CHAIN_ID = '0x1';

const MOCK_ACCOUNTS = Object.values(
  MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts,
);

const MOCK_ACCOUNT_1: Account = {
  id: MOCK_ACCOUNTS[0].id,
  name: 'Account 1',
  address: toChecksumAddress(MOCK_ACCOUNTS[0].address),
  type: KeyringTypes.hd,
  yOffset: 0,
  isSelected: false,
  caipAccountId: `eip155:0:${MOCK_ACCOUNTS[0].address}`,
  scopes: [EthScope.Eoa],
  isLoadingAccount: false,
  snapId: undefined,
};
const MOCK_ACCOUNT_2: Account = {
  id: MOCK_ACCOUNTS[1].id,
  name: 'Account 2',
  address: toChecksumAddress(MOCK_ACCOUNTS[1].address),
  type: KeyringTypes.hd,
  yOffset: 78,
  isSelected: true,
  caipAccountId: `eip155:0:${MOCK_ACCOUNTS[1].address}`,
  scopes: [EthScope.Eoa],
  isLoadingAccount: false,
  snapId: undefined,
};

const MOCK_STORE_STATE = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      AccountTrackerController: {
        accountsByChainId: {
          '0x1': {
            [MOCK_ACCOUNT_1.address]: {
              balance: '0x0',
            },
            [MOCK_ACCOUNT_2.address]: {
              balance: '0x5',
            },
          },
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

  it('returns scopes for evm accounts', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAccounts());
    await act(async () => {
      await waitForNextUpdate();
    });
    expect(result.current.accounts[0].scopes).toStrictEqual([EthScope.Eoa]);
  });

  describe('fetchENS parameter', () => {
    it('fetches ENS names when fetchENS is true (default)', async () => {
      const expectedENSNames = {
        [MOCK_ACCOUNT_1.address]: MOCK_ENS_CACHED_NAME,
      };

      const { result, waitForNextUpdate } = renderHook(() => useAccounts());
      await act(async () => {
        await waitForNextUpdate();
      });

      expect(result.current.ensByAccountAddress).toStrictEqual(
        expectedENSNames,
      );
    });

    it('fetches ENS names when fetchENS is explicitly true', async () => {
      const expectedENSNames = {
        [MOCK_ACCOUNT_1.address]: MOCK_ENS_CACHED_NAME,
      };

      const { result, waitForNextUpdate } = renderHook(() =>
        useAccounts({ fetchENS: true }),
      );
      await act(async () => {
        await waitForNextUpdate();
      });

      expect(result.current.ensByAccountAddress).toStrictEqual(
        expectedENSNames,
      );
    });

    it('does not fetch ENS names when fetchENS is false', async () => {
      const { result } = renderHook(() => useAccounts({ fetchENS: false }));

      // Give some time for any potential async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.ensByAccountAddress).toStrictEqual({});
    });

    it('returns accounts but not ENS names when fetchENS is false', async () => {
      const expectedInternalAccounts: Account[] = [
        MOCK_ACCOUNT_1,
        MOCK_ACCOUNT_2,
      ];

      const { result } = renderHook(() => useAccounts({ fetchENS: false }));

      // Give some time for accounts to be populated
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.accounts).toStrictEqual(expectedInternalAccounts);
      expect(result.current.ensByAccountAddress).toStrictEqual({});
    });
  });
});
