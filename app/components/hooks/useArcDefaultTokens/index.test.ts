import {
  renderHookWithProvider,
  type DeepPartial,
} from '../../../util/test/renderWithProvider';
import type { RootState } from '../../../reducers';
import type { AccountsControllerState } from '@metamask/accounts-controller';
import type { CaipAssetType } from '@metamask/utils';
import Engine from '../../../core/Engine';
import { useArcDefaultTokens } from './index';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('../../../core/Engine', () => ({
  context: {
    AssetsController: {
      addCustomAsset: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ARC_CHAIN_ID = '0x13b2';
const ARC_USDC_ASSET_ID =
  'eip155:5042/erc20:0x3600000000000000000000000000000000000000';

const evmAccount1 = {
  id: 'evm-account-1',
  address: '0x1111111111111111111111111111111111111111',
  type: 'eip155:eoa',
  options: {},
  methods: [],
  scopes: ['eip155:0'],
  metadata: {
    name: 'Account 1',
    importTime: 0,
    keyring: { type: 'HD Key Tree' },
  },
};

const evmAccount2 = {
  id: 'evm-account-2',
  address: '0x2222222222222222222222222222222222222222',
  type: 'eip155:eoa',
  options: {},
  methods: [],
  scopes: ['eip155:0'],
  metadata: {
    name: 'Account 2',
    importTime: 0,
    keyring: { type: 'HD Key Tree' },
  },
};

const solanaAccount = {
  id: 'solana-account-1',
  address: 'SoLaNaAddRessFoRTeStiNg11111111111111111111',
  type: 'solana:data-account',
  options: {},
  methods: [],
  scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
  metadata: {
    name: 'Solana Account',
    importTime: 0,
    keyring: { type: 'Snap Keyring' },
  },
};

const buildState = ({
  arcPresent = true,
  accounts = [evmAccount1],
  existingArcAssetIds,
}: {
  arcPresent?: boolean;
  accounts?: (typeof evmAccount1 | typeof solanaAccount)[];
  existingArcAssetIds?: string[];
} = {}): DeepPartial<RootState> => ({
  engine: {
    backgroundState: {
      NetworkController: {
        networkConfigurationsByChainId: arcPresent
          ? { [ARC_CHAIN_ID]: { chainId: ARC_CHAIN_ID, name: 'Arc' } }
          : {},
      },
      AccountsController: {
        internalAccounts: {
          accounts: Object.fromEntries(
            accounts.map((a) => [a.id, a]),
          ) as unknown as AccountsControllerState['internalAccounts']['accounts'],
          selectedAccount: accounts[0]?.id ?? '',
        },
      },
      KeyringController: {
        keyrings: [
          {
            type: 'HD Key Tree',
            accounts: accounts.map((a) => a.address),
          },
        ],
      },
      AssetsController: {
        customAssets: existingArcAssetIds
          ? { [accounts[0].id]: existingArcAssetIds as CaipAssetType[] }
          : {},
        assetsBalance: existingArcAssetIds
          ? {
              [accounts[0].id]: Object.fromEntries(
                existingArcAssetIds.map((assetId) => [
                  assetId,
                  { amount: '1' },
                ]),
              ),
            }
          : {},
      },
    },
  },
});

const mockAddCustomAsset = jest.mocked(
  Engine.context.AssetsController.addCustomAsset,
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useArcDefaultTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls addCustomAsset for an EVM account when Arc is present and the asset is missing', () => {
    renderHookWithProvider(() => useArcDefaultTokens(), {
      state: buildState(),
    });

    expect(mockAddCustomAsset).toHaveBeenCalledTimes(1);
    expect(mockAddCustomAsset).toHaveBeenCalledWith(
      evmAccount1.id,
      ARC_USDC_ASSET_ID,
    );
  });

  it('calls addCustomAsset for every EVM account', () => {
    renderHookWithProvider(() => useArcDefaultTokens(), {
      state: buildState({ accounts: [evmAccount1, evmAccount2] }),
    });

    expect(mockAddCustomAsset).toHaveBeenCalledTimes(2);
    expect(mockAddCustomAsset).toHaveBeenCalledWith(
      evmAccount1.id,
      ARC_USDC_ASSET_ID,
    );
    expect(mockAddCustomAsset).toHaveBeenCalledWith(
      evmAccount2.id,
      ARC_USDC_ASSET_ID,
    );
  });

  it('does nothing when the Arc network is not present', () => {
    renderHookWithProvider(() => useArcDefaultTokens(), {
      state: buildState({ arcPresent: false }),
    });

    expect(mockAddCustomAsset).not.toHaveBeenCalled();
  });

  it('skips non-EVM accounts', () => {
    renderHookWithProvider(() => useArcDefaultTokens(), {
      state: buildState({ accounts: [solanaAccount] }),
    });

    expect(mockAddCustomAsset).not.toHaveBeenCalled();
  });

  it('calls addCustomAsset only for EVM accounts when mixed with non-EVM accounts', () => {
    renderHookWithProvider(() => useArcDefaultTokens(), {
      state: buildState({ accounts: [evmAccount1, solanaAccount] }),
    });

    expect(mockAddCustomAsset).toHaveBeenCalledTimes(1);
    expect(mockAddCustomAsset).toHaveBeenCalledWith(
      evmAccount1.id,
      ARC_USDC_ASSET_ID,
    );
  });

  it('does not call addCustomAsset when the account already has the Arc USDC asset', () => {
    renderHookWithProvider(() => useArcDefaultTokens(), {
      state: buildState({
        existingArcAssetIds: [ARC_USDC_ASSET_ID],
      }),
    });

    expect(mockAddCustomAsset).not.toHaveBeenCalled();
  });

  it('treats the existing asset ID case-insensitively', () => {
    renderHookWithProvider(() => useArcDefaultTokens(), {
      state: buildState({
        existingArcAssetIds: [ARC_USDC_ASSET_ID.toUpperCase()],
      }),
    });

    expect(mockAddCustomAsset).not.toHaveBeenCalled();
  });

  it('does not re-dispatch on re-render', () => {
    const { rerender } = renderHookWithProvider(() => useArcDefaultTokens(), {
      state: buildState(),
    });

    expect(mockAddCustomAsset).toHaveBeenCalledTimes(1);
    rerender(undefined);
    expect(mockAddCustomAsset).toHaveBeenCalledTimes(1);
  });
});
