import type { DeepPartial } from 'app/util/test/renderWithProvider';
import type { RootState } from 'app/reducers';

/**
 * Base state overrides for Send view component tests.
 * Use with initialStateWallet(): initialStateWallet().withOverrides(sendViewOverrides).build()
 * or spread and extend for scenario-specific state (e.g. TRON send).
 */
export const sendViewOverrides = {
  settings: {
    basicFunctionalityEnabled: true,
  },
  engine: {
    backgroundState: {
      AddressBookController: {
        addressBook: {},
      },
      MultichainNetworkController: {
        isEvmSelected: true,
      },
      SnapController: {
        snaps: {},
      },
      PermissionController: {
        subjects: {},
      },
      NftController: {
        allNfts: {},
        allNftContracts: {},
      },
      SignatureController: {
        signatureRequests: {},
        unapprovedPersonalMsgs: {},
        unapprovedTypedMessages: {},
        unapprovedPersonalMsgCount: 0,
        unapprovedTypedMessagesCount: 0,
      },
    },
  },
} as unknown as DeepPartial<RootState>;

const TRON_SEND_GROUP_ID = 'entropy:wallet1/0';
const TRON_SEND_WALLETS_KEY = 'entropy:wallet1';
const TRON_SEND_ACCOUNT_IDS = ['tron-acc-1', 'tron-acc-2', 'tron-acc-3'];

export interface TronSendFixtureOptions {
  senderAddress?: string;
  recipientAddresses?: [string, string];
}

export interface TronSendFixture {
  tronOverrides: DeepPartial<RootState>;
  recipientAddresses: [string, string];
}

/**
 * Builds state overrides and recipient addresses for TRON send view tests.
 * Use with initialStateWallet().withOverrides(tronOverrides).build().
 */
export function buildTronSendFixture(
  options: TronSendFixtureOptions = {},
): TronSendFixture {
  const senderAddress =
    options.senderAddress ?? 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7';
  const recipientAddresses =
    options.recipientAddresses ??
    ([
      'TA9vN2KmER9cuVBaHxQjzzRtXnBCdF7D4u',
      'TLv2f6VPqDgRE67v1736s7bJ8Ray5wYjU8',
    ] as [string, string]);

  const TRON_MAINNET_SCOPE = 'tron:728126428';

  const tronAccountEntries = Object.fromEntries([
    [
      TRON_SEND_ACCOUNT_IDS[0],
      {
        id: TRON_SEND_ACCOUNT_IDS[0],
        address: senderAddress,
        metadata: { name: 'Tron Account 1', importTime: Date.now() },
        options: {},
        methods: [],
        type: 'tron:eoa',
        scopes: [TRON_MAINNET_SCOPE],
      },
    ],
    [
      TRON_SEND_ACCOUNT_IDS[1],
      {
        id: TRON_SEND_ACCOUNT_IDS[1],
        address: recipientAddresses[0],
        metadata: { name: 'Tron Account 2', importTime: Date.now() },
        options: {},
        methods: [],
        type: 'tron:eoa',
        scopes: [TRON_MAINNET_SCOPE],
      },
    ],
    [
      TRON_SEND_ACCOUNT_IDS[2],
      {
        id: TRON_SEND_ACCOUNT_IDS[2],
        address: recipientAddresses[1],
        metadata: { name: 'Tron Account 3', importTime: Date.now() },
        options: {},
        methods: [],
        type: 'tron:eoa',
        scopes: [TRON_MAINNET_SCOPE],
      },
    ],
  ]);

  const baseEngine = (sendViewOverrides as Record<string, unknown>).engine as
    | { backgroundState?: Record<string, unknown> }
    | undefined;
  const tronOverrides = {
    ...sendViewOverrides,
    engine: {
      backgroundState: {
        ...(baseEngine?.backgroundState ?? {}),
        MultichainNetworkController: {
          isEvmSelected: false,
        },
        AccountsController: {
          internalAccounts: {
            accounts: tronAccountEntries,
            selectedAccount: TRON_SEND_ACCOUNT_IDS[0],
          },
        },
        AccountTreeController: {
          accountTree: {
            selectedAccountGroup: TRON_SEND_GROUP_ID,
            wallets: {
              [TRON_SEND_WALLETS_KEY]: {
                id: TRON_SEND_WALLETS_KEY,
                type: 'Entropy',
                metadata: { name: 'Wallet 1', entropy: { id: 'wallet1' } },
                groups: {
                  [TRON_SEND_GROUP_ID]: {
                    id: TRON_SEND_GROUP_ID,
                    type: 'MultipleAccount',
                    metadata: {
                      name: 'Group 1',
                      pinned: false,
                      hidden: false,
                    },
                    accounts: TRON_SEND_ACCOUNT_IDS,
                  },
                },
              },
            },
          },
        },
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            enableMultichainAccounts: {
              enabled: true,
              featureVersion: '1',
              minimumVersion: '0.0.0',
            },
          },
        },
      },
    },
  } as unknown as DeepPartial<RootState>;

  return { tronOverrides, recipientAddresses };
}

/**
 * Builds state overrides for non-EVM send tests that need an EVM contact in the address book.
 * Use to assert that EVM contacts do not appear on non-EVM (e.g. Solana) Recipient screen.
 */
export function buildAddressBookOverridesWithEvmContact(
  evmContactAddress: string,
): DeepPartial<RootState> {
  return {
    engine: {
      backgroundState: {
        AddressBookController: {
          addressBook: {
            '0x1': {
              [evmContactAddress.toLowerCase()]: {
                name: 'EVM Contact',
                address: evmContactAddress,
              },
            },
          },
        },
        MultichainNetworkController: {
          isEvmSelected: false,
        },
      },
    },
  } as unknown as DeepPartial<RootState>;
}
