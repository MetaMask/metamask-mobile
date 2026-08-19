import type { InternalAccount } from '@metamask/keyring-internal-api';
import Engine from '../Engine';
import {
  isAccountGroupAssetLoadPending,
  loadAccountGroupAssets,
  resetAccountGroupAssetLoaderForTests,
  subscribeToAccountGroupAssetLoads,
} from './accountGroupAssetLoader';

jest.mock('../Engine', () => ({
  context: {
    AssetsController: { getAssets: jest.fn() },
    AccountTrackerController: { refreshAddresses: jest.fn() },
    TokenBalancesController: { updateBalances: jest.fn() },
    TokenDetectionController: { detectTokens: jest.fn() },
    MultichainBalancesController: { updateBalance: jest.fn() },
    NetworkController: { findNetworkClientIdByChainId: jest.fn() },
  },
}));

const GROUP_ID = 'entropy:wallet-1/2';

const EVM_ACCOUNT = {
  id: 'evm-account-id',
  address: '0xabc',
} as unknown as InternalAccount;

const SOLANA_ACCOUNT = {
  id: 'solana-account-id',
  address: 'SoLaNaAddress',
} as unknown as InternalAccount;

const mockedEngine = jest.mocked(Engine);
const assetsController = mockedEngine.context.AssetsController as unknown as {
  getAssets: jest.Mock;
};
const accountTrackerController = mockedEngine.context
  .AccountTrackerController as unknown as { refreshAddresses: jest.Mock };
const tokenBalancesController = mockedEngine.context
  .TokenBalancesController as unknown as { updateBalances: jest.Mock };
const tokenDetectionController = mockedEngine.context
  .TokenDetectionController as unknown as { detectTokens: jest.Mock };
const multichainBalancesController = mockedEngine.context
  .MultichainBalancesController as unknown as { updateBalance: jest.Mock };
const networkController = mockedEngine.context.NetworkController as unknown as {
  findNetworkClientIdByChainId: jest.Mock;
};

function buildParams(overrides = {}) {
  return {
    groups: [{ accountGroupId: GROUP_ID, accounts: [EVM_ACCOUNT] }],
    caipChainIds: ['eip155:1' as const],
    evmChainIds: ['0x1' as const],
    isAssetsUnifyStateEnabled: true,
    ...overrides,
  };
}

describe('accountGroupAssetLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAccountGroupAssetLoaderForTests();

    assetsController.getAssets.mockResolvedValue({});
    accountTrackerController.refreshAddresses.mockResolvedValue(undefined);
    tokenBalancesController.updateBalances.mockResolvedValue(undefined);
    tokenDetectionController.detectTokens.mockResolvedValue(undefined);
    multichainBalancesController.updateBalance.mockResolvedValue(undefined);
    networkController.findNetworkClientIdByChainId.mockReturnValue('mainnet');
  });

  describe('unified assets state', () => {
    it('fetches assets for the requested account group', async () => {
      await loadAccountGroupAssets(buildParams());

      expect(assetsController.getAssets).toHaveBeenCalledWith([EVM_ACCOUNT], {
        chainIds: ['eip155:1'],
        assetTypes: ['fungible'],
        forceUpdate: true,
      });
    });

    it('does not fetch twice for the same group', async () => {
      await loadAccountGroupAssets(buildParams());
      await loadAccountGroupAssets(buildParams());

      expect(assetsController.getAssets).toHaveBeenCalledTimes(1);
    });

    it('fetches separately for a different group', async () => {
      await loadAccountGroupAssets(buildParams());
      await loadAccountGroupAssets(
        buildParams({
          groups: [
            { accountGroupId: 'entropy:wallet-1/3', accounts: [EVM_ACCOUNT] },
          ],
        }),
      );

      expect(assetsController.getAssets).toHaveBeenCalledTimes(2);
    });

    it('allows a retry after a failed fetch', async () => {
      assetsController.getAssets.mockRejectedValueOnce(new Error('boom'));

      await loadAccountGroupAssets(buildParams());
      await loadAccountGroupAssets(buildParams());

      expect(assetsController.getAssets).toHaveBeenCalledTimes(2);
    });

    it('skips the fetch when the group has no accounts', async () => {
      await loadAccountGroupAssets(
        buildParams({ groups: [{ accountGroupId: GROUP_ID, accounts: [] }] }),
      );

      expect(assetsController.getAssets).not.toHaveBeenCalled();
    });

    it('skips the fetch when no chains are enabled', async () => {
      await loadAccountGroupAssets(buildParams({ caipChainIds: [] }));

      expect(assetsController.getAssets).not.toHaveBeenCalled();
    });

    it('batches multiple groups into a single fetch', async () => {
      await loadAccountGroupAssets(
        buildParams({
          groups: [
            { accountGroupId: GROUP_ID, accounts: [EVM_ACCOUNT] },
            {
              accountGroupId: 'entropy:wallet-1/3',
              accounts: [SOLANA_ACCOUNT],
            },
          ],
        }),
      );

      expect(assetsController.getAssets).toHaveBeenCalledTimes(1);
      expect(assetsController.getAssets).toHaveBeenCalledWith(
        [EVM_ACCOUNT, SOLANA_ACCOUNT],
        expect.anything(),
      );
    });

    it('fetches only the groups not already requested', async () => {
      await loadAccountGroupAssets(buildParams());
      assetsController.getAssets.mockClear();

      await loadAccountGroupAssets(
        buildParams({
          groups: [
            { accountGroupId: GROUP_ID, accounts: [EVM_ACCOUNT] },
            {
              accountGroupId: 'entropy:wallet-1/3',
              accounts: [SOLANA_ACCOUNT],
            },
          ],
        }),
      );

      expect(assetsController.getAssets).toHaveBeenCalledWith(
        [SOLANA_ACCOUNT],
        expect.anything(),
      );
    });

    it('deduplicates accounts shared across groups', async () => {
      await loadAccountGroupAssets(
        buildParams({
          groups: [
            { accountGroupId: GROUP_ID, accounts: [EVM_ACCOUNT] },
            {
              accountGroupId: 'entropy:wallet-1/3',
              accounts: [EVM_ACCOUNT],
            },
          ],
        }),
      );

      expect(assetsController.getAssets).toHaveBeenCalledWith(
        [EVM_ACCOUNT],
        expect.anything(),
      );
    });

    it('marks every batched group pending and clears them all', async () => {
      let resolveFetch: () => void = () => undefined;
      assetsController.getAssets.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveFetch = resolve;
        }),
      );

      const promise = loadAccountGroupAssets(
        buildParams({
          groups: [
            { accountGroupId: GROUP_ID, accounts: [EVM_ACCOUNT] },
            {
              accountGroupId: 'entropy:wallet-1/3',
              accounts: [SOLANA_ACCOUNT],
            },
          ],
        }),
      );

      expect(isAccountGroupAssetLoadPending(GROUP_ID)).toBe(true);
      expect(isAccountGroupAssetLoadPending('entropy:wallet-1/3')).toBe(true);

      resolveFetch();
      await promise;

      expect(isAccountGroupAssetLoadPending(GROUP_ID)).toBe(false);
      expect(isAccountGroupAssetLoadPending('entropy:wallet-1/3')).toBe(false);
    });
  });

  describe('legacy assets state', () => {
    const legacyParams = () =>
      buildParams({
        groups: [
          {
            accountGroupId: GROUP_ID,
            accounts: [EVM_ACCOUNT, SOLANA_ACCOUNT],
          },
        ],
        isAssetsUnifyStateEnabled: false,
      });

    it('refreshes native balances for the override addresses', async () => {
      await loadAccountGroupAssets(legacyParams());

      expect(accountTrackerController.refreshAddresses).toHaveBeenCalledWith({
        networkClientIds: ['mainnet'],
        addresses: ['0xabc'],
      });
    });

    it('queries all accounts so the override account is not skipped', async () => {
      await loadAccountGroupAssets(legacyParams());

      expect(tokenBalancesController.updateBalances).toHaveBeenCalledWith({
        chainIds: ['0x1'],
        queryAllAccounts: true,
      });
    });

    it('detects tokens for the override address', async () => {
      await loadAccountGroupAssets(legacyParams());

      expect(tokenDetectionController.detectTokens).toHaveBeenCalledWith({
        chainIds: ['0x1'],
        selectedAddress: '0xabc',
      });
    });

    it('updates balances for non-EVM accounts in the group', async () => {
      await loadAccountGroupAssets(legacyParams());

      expect(multichainBalancesController.updateBalance).toHaveBeenCalledWith(
        'solana-account-id',
      );
    });

    it('does not use the unified controller', async () => {
      await loadAccountGroupAssets(legacyParams());

      expect(assetsController.getAssets).not.toHaveBeenCalled();
    });

    it('skips unconfigured chains', async () => {
      networkController.findNetworkClientIdByChainId.mockImplementation(() => {
        throw new Error('not configured');
      });

      await loadAccountGroupAssets(legacyParams());

      expect(accountTrackerController.refreshAddresses).not.toHaveBeenCalled();
    });
  });

  describe('pending state', () => {
    it('reports pending while a fetch is in flight and notifies subscribers', async () => {
      let resolveFetch: () => void = () => undefined;
      assetsController.getAssets.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveFetch = resolve;
        }),
      );

      const listener = jest.fn();
      const unsubscribe = subscribeToAccountGroupAssetLoads(listener);

      const promise = loadAccountGroupAssets(buildParams());

      expect(isAccountGroupAssetLoadPending(GROUP_ID)).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);

      resolveFetch();
      await promise;

      expect(isAccountGroupAssetLoadPending(GROUP_ID)).toBe(false);
      expect(listener).toHaveBeenCalledTimes(2);

      unsubscribe();
    });

    it('reports not pending for an unknown group', () => {
      expect(isAccountGroupAssetLoadPending('entropy:wallet-1/9')).toBe(false);
    });

    it('reports not pending when no group is given', () => {
      expect(isAccountGroupAssetLoadPending(undefined)).toBe(false);
    });

    it('clears pending state when the fetch rejects', async () => {
      assetsController.getAssets.mockRejectedValue(new Error('boom'));

      await loadAccountGroupAssets(buildParams());

      expect(isAccountGroupAssetLoadPending(GROUP_ID)).toBe(false);
    });

    it('stops notifying after unsubscribe', async () => {
      const listener = jest.fn();
      const unsubscribe = subscribeToAccountGroupAssetLoads(listener);
      unsubscribe();

      await loadAccountGroupAssets(buildParams());

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
