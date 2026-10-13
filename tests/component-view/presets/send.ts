import { add0x } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import {
  TransactionEnvelopeType,
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type { DeepPartial } from 'app/util/test/renderWithProvider';
import type { RootState } from 'app/reducers';
import { BtcAccountType } from '@metamask/keyring-api';

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

export interface StellarSendFixtureOptions {
  senderAddress?: string;
  recipientAddresses?: [string, string];
}

export interface StellarSendFixture {
  stellarOverrides: DeepPartial<RootState>;
  recipientAddresses: [string, string];
}

export const NON_EVM_SOLANA_ACCOUNT_ID = 'solana-acc-1';
export const NON_EVM_BTC_ACCOUNT_ID = 'btc-acc-1';

const SOLANA_MAINNET_SCOPE = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const BTC_MAINNET_SCOPE = 'bip122:000000000019d6689c085ae165831e93';

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
        ...baseEngine?.backgroundState,
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
                      lastSelected: 0,
                    },
                    accounts: TRON_SEND_ACCOUNT_IDS,
                  },
                },
              },
            },
          },
          selectedAccountGroup: TRON_SEND_GROUP_ID,
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

const STELLAR_SEND_GROUP_ID = 'entropy:wallet1/0';
const STELLAR_SEND_WALLETS_KEY = 'entropy:wallet1';
const STELLAR_SEND_ACCOUNT_IDS = [
  'stellar-acc-1',
  'stellar-acc-2',
  'stellar-acc-3',
];

/**
 * Builds state overrides and recipient addresses for Stellar send view tests.
 * Use with initialStateWallet().withOverrides(stellarOverrides).build().
 */
export function buildStellarSendFixture(
  options: StellarSendFixtureOptions = {},
): StellarSendFixture {
  const senderAddress =
    options.senderAddress ??
    'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NYMPL5AFHTDXUDT7JOZZYNQLEI';
  const recipientAddresses =
    options.recipientAddresses ??
    ([
      'GCEZWKCA5VLDNRLD3HRGYFMXLE3ZPZF6NPSQ2GDBZKTYISBDMZCFLPTB',
      'GCQTGZO5X3UK6YOLYUKJ5FRQGG4OHUTYPTEZ7MY3LY5KVWE5U7ATFIQX',
    ] as [string, string]);

  const STELLAR_MAINNET_SCOPE = 'stellar:pubnet';

  const stellarAccountEntries = Object.fromEntries([
    [
      STELLAR_SEND_ACCOUNT_IDS[0],
      {
        id: STELLAR_SEND_ACCOUNT_IDS[0],
        address: senderAddress,
        metadata: { name: 'Stellar Account 1', importTime: Date.now() },
        options: {},
        methods: [],
        type: 'stellar:account',
        scopes: [STELLAR_MAINNET_SCOPE],
      },
    ],
    [
      STELLAR_SEND_ACCOUNT_IDS[1],
      {
        id: STELLAR_SEND_ACCOUNT_IDS[1],
        address: recipientAddresses[0],
        metadata: { name: 'Stellar Account 2', importTime: Date.now() },
        options: {},
        methods: [],
        type: 'stellar:account',
        scopes: [STELLAR_MAINNET_SCOPE],
      },
    ],
    [
      STELLAR_SEND_ACCOUNT_IDS[2],
      {
        id: STELLAR_SEND_ACCOUNT_IDS[2],
        address: recipientAddresses[1],
        metadata: { name: 'Stellar Account 3', importTime: Date.now() },
        options: {},
        methods: [],
        type: 'stellar:account',
        scopes: [STELLAR_MAINNET_SCOPE],
      },
    ],
  ]);

  const baseEngine = (sendViewOverrides as Record<string, unknown>).engine as
    | { backgroundState?: Record<string, unknown> }
    | undefined;
  const stellarOverrides = {
    ...sendViewOverrides,
    engine: {
      backgroundState: {
        ...baseEngine?.backgroundState,
        MultichainNetworkController: {
          isEvmSelected: false,
        },
        AccountsController: {
          internalAccounts: {
            accounts: stellarAccountEntries,
            selectedAccount: STELLAR_SEND_ACCOUNT_IDS[0],
          },
        },
        AccountTreeController: {
          accountTree: {
            wallets: {
              [STELLAR_SEND_WALLETS_KEY]: {
                id: STELLAR_SEND_WALLETS_KEY,
                type: 'Entropy',
                metadata: { name: 'Wallet 1', entropy: { id: 'wallet1' } },
                groups: {
                  [STELLAR_SEND_GROUP_ID]: {
                    id: STELLAR_SEND_GROUP_ID,
                    type: 'MultipleAccount',
                    metadata: {
                      name: 'Group 1',
                      pinned: false,
                      hidden: false,
                      lastSelected: 0,
                    },
                    accounts: STELLAR_SEND_ACCOUNT_IDS,
                  },
                },
              },
            },
          },
          selectedAccountGroup: STELLAR_SEND_GROUP_ID,
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

  return { stellarOverrides, recipientAddresses };
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

/** Wallet fixture account. Max-native send uses this as `txParams.from`. */
export const MAX_NATIVE_SEND_SENDER =
  '0x0000000000000000000000000000000000000001';

export const MAX_NATIVE_SEND_RECIPIENT =
  '0x0000000000000000000000000000000000000002';

export const MAX_NATIVE_SEND_TX_ID = 'max-native-send-cv';

export const MAX_NATIVE_SEND_HASH = '0xmaxnativesendcv';

/** 1 ETH. The amount screen Max button fills this in before confirmation. */
export const MAX_NATIVE_BALANCE_WEI_HEX = '0xde0b6b3a7640000';

/**
 * 100000 gas * 1000 gwei = 0.1 ETH. Large enough that confirmation shows 0.9
 * instead of rounding back to the full 1 ETH balance.
 */
export const MAX_NATIVE_GAS_HEX = '0x186a0';

export const MAX_NATIVE_MAX_FEE_PER_GAS_HEX = '0xe8d4a51000';

const maxNativeFeeWei = new BigNumber(MAX_NATIVE_GAS_HEX).times(
  MAX_NATIVE_MAX_FEE_PER_GAS_HEX,
);

/** Balance minus the fixture max fee. Confirmation must submit this value. */
export const MAX_NATIVE_RESERVED_VALUE_HEX = add0x(
  new BigNumber(MAX_NATIVE_BALANCE_WEI_HEX).minus(maxNativeFeeWei).toString(16),
);

export interface MaxNativeSendChain {
  name: string;
  chainId: string;
  networkClientId: string;
  networkName: string;
}

/** Ink, plus Ethereum mainnet as the send-vs-confirmation parity chain. */
export const MAX_NATIVE_SEND_CHAINS: readonly MaxNativeSendChain[] = [
  {
    name: 'Ink',
    chainId: '0xdef1',
    networkClientId: 'ink',
    networkName: 'Ink',
  },
  {
    name: 'Ethereum',
    chainId: '0x1',
    networkClientId: 'mainnet',
    networkName: 'Ethereum Main Network',
  },
];

const maxNativeGasFeeEstimates = {
  low: {
    suggestedMaxPriorityFeePerGas: '0',
    suggestedMaxFeePerGas: '1000',
    minWaitTimeEstimate: 30000,
    maxWaitTimeEstimate: 60000,
  },
  medium: {
    suggestedMaxPriorityFeePerGas: '0',
    suggestedMaxFeePerGas: '1000',
    minWaitTimeEstimate: 20000,
    maxWaitTimeEstimate: 40000,
  },
  high: {
    suggestedMaxPriorityFeePerGas: '0',
    suggestedMaxFeePerGas: '1000',
    minWaitTimeEstimate: 10000,
    maxWaitTimeEstimate: 15000,
  },
  estimatedBaseFee: '1000',
  historicalBaseFeeRange: ['1000', '1000'],
  baseFeeTrend: 'down',
  latestPriorityFeeRange: ['0', '0'],
  historicalPriorityFeeRange: ['0', '0'],
  priorityFeeTrend: 'up',
  networkCongestion: 0,
};

export function buildMaxNativeSendTransaction(
  chain: MaxNativeSendChain,
  overrides: { status?: TransactionStatus; value?: string } = {},
): TransactionMeta {
  return {
    id: MAX_NATIVE_SEND_TX_ID,
    hash: MAX_NATIVE_SEND_HASH,
    origin: 'metamask',
    chainId: chain.chainId,
    networkClientId: chain.networkClientId,
    status: overrides.status ?? TransactionStatus.unapproved,
    time: 1_716_367_781_000,
    type: TransactionType.simpleSend,
    txParams: {
      from: MAX_NATIVE_SEND_SENDER,
      to: MAX_NATIVE_SEND_RECIPIENT,
      value: overrides.value ?? MAX_NATIVE_BALANCE_WEI_HEX,
      gas: MAX_NATIVE_GAS_HEX,
      maxFeePerGas: MAX_NATIVE_MAX_FEE_PER_GAS_HEX,
      maxPriorityFeePerGas: '0x0',
      type: TransactionEnvelopeType.feeMarket,
      nonce: '0x0',
    },
  } as unknown as TransactionMeta;
}

/**
 * Redux overrides for a max native send on Ink or mainnet.
 * Network config is merged beside the wallet preset's mainnet entry.
 */
export function buildMaxNativeSendFixture(
  chain: MaxNativeSendChain,
): DeepPartial<RootState> {
  const transaction = buildMaxNativeSendTransaction(chain);
  const recipientKey = `${chain.chainId}:${MAX_NATIVE_SEND_RECIPIENT}`;

  return {
    engine: {
      backgroundState: {
        AccountTrackerController: {
          accountsByChainId: {
            [chain.chainId]: {
              [MAX_NATIVE_SEND_SENDER]: {
                balance: MAX_NATIVE_BALANCE_WEI_HEX,
              },
            },
          },
        },
        AssetsController: {
          // useAccountNativeBalance reads this migration view, not
          // AccountTrackerController. `amount` is a decimal token balance;
          // 18 decimals turns "1" into 1 ETH.
          assetsBalance: {
            'acc-1': {
              [`eip155:${Number.parseInt(chain.chainId, 16)}/slip44:60`]: {
                amount: '1',
              },
            },
          },
          assetsInfo: {
            [`eip155:${Number.parseInt(chain.chainId, 16)}/slip44:60`]: {
              type: 'native',
              symbol: 'ETH',
              name: chain.networkName,
              decimals: 18,
            },
          },
        },
        ApprovalController: {
          pendingApprovals: {
            [MAX_NATIVE_SEND_TX_ID]: {
              id: MAX_NATIVE_SEND_TX_ID,
              origin: 'metamask',
              type: 'transaction',
              time: 1_716_367_781_000,
              requestData: { txId: MAX_NATIVE_SEND_TX_ID },
              expectsResult: false,
            },
          },
          pendingApprovalCount: 1,
        },
        GasFeeController: {
          gasFeeEstimatesByChainId: {
            [chain.chainId]: maxNativeGasFeeEstimates,
          },
        },
        NetworkController: {
          selectedNetworkClientId: chain.networkClientId,
          networksMetadata: {
            [chain.networkClientId]: {
              status: 'available',
              EIPS: { 1559: true },
            },
          },
          networkConfigurationsByChainId: {
            [chain.chainId]: {
              chainId: chain.chainId,
              name: chain.networkName,
              nativeCurrency: 'ETH',
              defaultRpcEndpointIndex: 0,
              defaultBlockExplorerUrlIndex: 0,
              blockExplorerUrls: ['https://explorer.example'],
              rpcEndpoints: [
                {
                  networkClientId: chain.networkClientId,
                  url: 'https://rpc.example',
                  type: 'custom',
                  name: chain.networkName,
                },
              ],
            },
          },
        },
        NetworkEnablementController: {
          enabledNetworkMap: {
            eip155: {
              '0x1': true,
              [chain.chainId]: true,
            },
          },
        },
        PhishingController: {
          addressScanCache: {
            [recipientKey]: {
              data: {
                result_type: 'Trusted',
              },
            },
          },
        },
        PreferencesController: {
          privacyMode: false,
        },
        TransactionController: {
          transactions: [transaction],
          swapsTransactions: {},
        },
      },
    },
  } as unknown as DeepPartial<RootState>;
}

/**
 * Builds non-EVM internal accounts (Solana + Bitcoin) for send CV tests that
 * need a concrete `fromAccount` to drive snap amount/submit validation.
 */
export function buildNonEvmSendAccountsOverrides(): DeepPartial<RootState> {
  return {
    engine: {
      backgroundState: {
        AccountsController: {
          internalAccounts: {
            accounts: {
              [NON_EVM_SOLANA_ACCOUNT_ID]: {
                id: NON_EVM_SOLANA_ACCOUNT_ID,
                address: '11111111111111111111111111111111',
                type: 'solana:data-account',
                options: {},
                methods: [],
                metadata: {
                  name: 'Solana Account 1',
                },
                scopes: [SOLANA_MAINNET_SCOPE],
              },
              [NON_EVM_BTC_ACCOUNT_ID]: {
                id: NON_EVM_BTC_ACCOUNT_ID,
                address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
                type: BtcAccountType.P2wpkh,
                options: {},
                methods: [],
                metadata: {
                  name: 'Bitcoin Account 1',
                },
                scopes: [BTC_MAINNET_SCOPE],
              },
            },
            selectedAccount: NON_EVM_SOLANA_ACCOUNT_ID,
          },
        },
      },
    },
  } as unknown as DeepPartial<RootState>;
}
