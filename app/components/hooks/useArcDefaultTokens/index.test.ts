import {
  renderHookWithProvider,
  type DeepPartial,
} from '../../../util/test/renderWithProvider';
import type { RootState } from '../../../reducers';
import type { AccountsControllerState } from '@metamask/accounts-controller';
import type { MultichainAssetsControllerState } from '@metamask/assets-controllers';
import Engine from '../../../core/Engine';
import { useArcDefaultTokens } from './index';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('../../../core/Engine', () => ({
  context: {
    MultichainAssetsController: {
      addAssets: jest.fn().mockResolvedValue(undefined),
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
  accountsAssets = {},
}: {
  arcPresent?: boolean;
  accounts?: (typeof evmAccount1 | typeof solanaAccount)[];
  accountsAssets?: Record<string, string[]>;
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
      MultichainAssetsController: {
        accountsAssets:
          accountsAssets as unknown as MultichainAssetsControllerState['accountsAssets'],
      },
    },
  },
});

const mockAddAssets = jest.mocked(
  Engine.context.MultichainAssetsController.addAssets,
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useArcDefaultTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls addAssets for an EVM account when Arc is present and the asset is missing', () => {
    renderHookWithProvider(() => useArcDefaultTokens(), {
      state: buildState(),
    });

    expect(mockAddAssets).toHaveBeenCalledTimes(1);
    expect(mockAddAssets).toHaveBeenCalledWith(
      [ARC_USDC_ASSET_ID],
      evmAccount1.id,
    );
  });

  it('calls addAssets for every EVM account', () => {
    renderHookWithProvider(() => useArcDefaultTokens(), {
      state: buildState({ accounts: [evmAccount1, evmAccount2] }),
    });

    expect(mockAddAssets).toHaveBeenCalledTimes(2);
    expect(mockAddAssets).toHaveBeenCalledWith(
      [ARC_USDC_ASSET_ID],
      evmAccount1.id,
    );
    expect(mockAddAssets).toHaveBeenCalledWith(
      [ARC_USDC_ASSET_ID],
      evmAccount2.id,
    );
  });

  it('does nothing when the Arc network is not present', () => {
    renderHookWithProvider(() => useArcDefaultTokens(), {
      state: buildState({ arcPresent: false }),
    });

    expect(mockAddAssets).not.toHaveBeenCalled();
  });

  it('skips non-EVM accounts', () => {
    renderHookWithProvider(() => useArcDefaultTokens(), {
      state: buildState({ accounts: [solanaAccount] }),
    });

    expect(mockAddAssets).not.toHaveBeenCalled();
  });

  it('calls addAssets only for EVM accounts when mixed with non-EVM accounts', () => {
    renderHookWithProvider(() => useArcDefaultTokens(), {
      state: buildState({ accounts: [evmAccount1, solanaAccount] }),
    });

    expect(mockAddAssets).toHaveBeenCalledTimes(1);
    expect(mockAddAssets).toHaveBeenCalledWith(
      [ARC_USDC_ASSET_ID],
      evmAccount1.id,
    );
  });

  it('does not call addAssets when the account already has the Arc USDC asset', () => {
    renderHookWithProvider(() => useArcDefaultTokens(), {
      state: buildState({
        accountsAssets: { [evmAccount1.id]: [ARC_USDC_ASSET_ID] },
      }),
    });

    expect(mockAddAssets).not.toHaveBeenCalled();
  });

  it('treats the existing asset ID case-insensitively', () => {
    renderHookWithProvider(() => useArcDefaultTokens(), {
      state: buildState({
        accountsAssets: { [evmAccount1.id]: [ARC_USDC_ASSET_ID.toUpperCase()] },
      }),
    });

    expect(mockAddAssets).not.toHaveBeenCalled();
  });

  it('does not re-dispatch on re-render', () => {
    const { rerender } = renderHookWithProvider(() => useArcDefaultTokens(), {
      state: buildState(),
    });

    expect(mockAddAssets).toHaveBeenCalledTimes(1);
    rerender(undefined);
    expect(mockAddAssets).toHaveBeenCalledTimes(1);
  });
});
