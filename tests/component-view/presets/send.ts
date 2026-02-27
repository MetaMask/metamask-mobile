import type { DeepPartial } from '../../renderWithProvider';
import type { RootState } from '../../../../reducers';

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

const EVM_SEND_GROUP_ID = 'entropy:wallet1/0';
const EVM_SEND_WALLETS_KEY = 'entropy:wallet1';
const EVM_SEND_ACCOUNT_IDS = ['acc-1', 'acc-2'] as const;

export interface EvmSendWithMultipleAccountsFixture {
  evmOverrides: DeepPartial<RootState>;
  recipientAddress: string;
}

/**
 * Builds state overrides for Send view tests that need a recipient list (Accounts).
 * Uses two EVM accounts so the Recipient screen shows one selectable account.
 * Use with initialStateWallet().withOverrides(evmOverrides).build().
 */
export function buildEvmSendWithMultipleAccountsFixture(): EvmSendWithMultipleAccountsFixture {
  const senderAddress = '0x0000000000000000000000000000000000000001';
  const recipientAddress = '0x0000000000000000000000000000000000000002';

  const evmAccountEntries = {
    [EVM_SEND_ACCOUNT_IDS[0]]: {
      id: EVM_SEND_ACCOUNT_IDS[0],
      address: senderAddress,
      metadata: { name: 'Account 1', importTime: Date.now() },
      options: {},
      methods: [
        'personal_sign',
        'eth_sign',
        'eth_signTransaction',
        'eth_signTypedData_v1',
        'eth_signTypedData_v3',
        'eth_signTypedData_v4',
      ],
      type: 'eip155:eoa',
      scopes: ['eip155:0'],
    },
    [EVM_SEND_ACCOUNT_IDS[1]]: {
      id: EVM_SEND_ACCOUNT_IDS[1],
      address: recipientAddress,
      metadata: { name: 'Account 2', importTime: Date.now() },
      options: {},
      methods: [
        'personal_sign',
        'eth_sign',
        'eth_signTransaction',
        'eth_signTypedData_v1',
        'eth_signTypedData_v3',
        'eth_signTypedData_v4',
      ],
      type: 'eip155:eoa',
      scopes: ['eip155:0'],
    },
  };

  const baseEngine = (sendViewOverrides as Record<string, unknown>).engine as
    | { backgroundState?: Record<string, unknown> }
    | undefined;
  const evmOverrides = {
    ...sendViewOverrides,
    engine: {
      backgroundState: {
        ...(baseEngine?.backgroundState ?? {}),
        AccountsController: {
          internalAccounts: {
            accounts: evmAccountEntries,
            selectedAccount: EVM_SEND_ACCOUNT_IDS[0],
          },
        },
        AccountTreeController: {
          accountTree: {
            selectedAccountGroup: EVM_SEND_GROUP_ID,
            wallets: {
              [EVM_SEND_WALLETS_KEY]: {
                id: EVM_SEND_WALLETS_KEY,
                type: 'Entropy',
                metadata: { name: 'Wallet 1', entropy: { id: 'wallet1' } },
                groups: {
                  [EVM_SEND_GROUP_ID]: {
                    id: EVM_SEND_GROUP_ID,
                    type: 'MultipleAccount',
                    metadata: {
                      name: 'Group 1',
                      pinned: false,
                      hidden: false,
                    },
                    accounts: [...EVM_SEND_ACCOUNT_IDS],
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

  return { evmOverrides, recipientAddress };
}

/** Default addresses for WETH send flow tests (mainnet). */
export const WETH_SEND_FROM_ADDRESS =
  '0x0000000000000000000000000000000000000001';
export const WETH_SEND_TO_ADDRESS =
  '0x0000000000000000000000000000000000000002';

export interface WethSendApprovalOverrideOptions {
  pendingApprovalId?: string;
  fromAddress?: string;
  toAddress?: string;
}

/**
 * Builds state overrides for WETH (or ERC-20) send flow tests that go through Review to Confirm.
 * Provides ApprovalController (transaction approval), TransactionController (matching tx),
 * and TokenListController (tokensChainsCache so useERC20Tokens does not read undefined).
 * Use with initialStateWallet().withOverrides(sendViewOverrides).withOverrides(overrides).build().
 */
export function buildWethSendApprovalOverride(
  options: WethSendApprovalOverrideOptions = {},
): DeepPartial<RootState> {
  const pendingApprovalId =
    options.pendingApprovalId ?? 'send-test-approval-id';
  const fromAddress = options.fromAddress ?? WETH_SEND_FROM_ADDRESS;
  const toAddress = options.toAddress ?? WETH_SEND_TO_ADDRESS;
  const now = Date.now();

  return {
    engine: {
      backgroundState: {
        ApprovalController: {
          pendingApprovals: {
            [pendingApprovalId]: {
              id: pendingApprovalId,
              type: 'transaction',
              origin: 'metamask',
              requestData: { txId: pendingApprovalId },
              requestState: null,
              expectsResult: true,
              time: now,
            },
          },
          pendingApprovalCount: 1,
          approvalFlows: [],
        },
        TransactionController: {
          transactions: [
            {
              id: pendingApprovalId,
              chainId: '0x1',
              txParams: {
                from: fromAddress,
                to: toAddress,
                value: '0x0',
                data: '0x',
                gas: '0x5208',
              },
              type: 'simpleSend',
              status: 'unapproved',
              time: now,
            },
          ],
        },
        TokenListController: {
          tokensChainsCache: {
            '0x1': { data: {} },
          },
        },
      },
    },
  } as unknown as DeepPartial<RootState>;
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
