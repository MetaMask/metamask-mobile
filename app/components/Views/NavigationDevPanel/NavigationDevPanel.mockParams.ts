import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import type { Nft } from '@metamask/assets-controllers';
import { IconName } from '@metamask/design-system-react-native';
import { SeasonRewardType } from '../../../core/Engine/controllers/rewards-controller/types';
import type { CaipChainId , SemVerVersion } from '@metamask/utils';
import { StatusTypes } from '@metamask/bridge-controller';
import {
  DepositOrderType,
  type DepositOrder,
} from '@consensys/native-ramps-sdk';
import {
  OrderOrderTypeEnum,
  type SellOrder,
} from '@consensys/on-ramp-sdk/dist/API';
import { RampsOrderStatus, type RampsOrder } from '@metamask/ramps-controller';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
///: BEGIN:ONLY_INCLUDE_IF(snaps)
import type { Snap, Status } from '@metamask/snaps-utils';
///: END:ONLY_INCLUDE_IF

import Routes from '../../../constants/navigation/Routes';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../constants/on-ramp';
import Engine from '../../../core/Engine';
import { addFiatOrder } from '../../../reducers/fiatOrders';
import type { FiatOrder } from '../../../reducers/fiatOrders/types';

// --- General route params (PR2 / PR3) ---

/** Minimal NFT payload so NftDetails / NftDetailsFullImage render without crashing. */
export const MOCK_NFT_COLLECTIBLE = {
  name: 'Dev Panel NFT',
  tokenId: '42',
  image: 'https://via.placeholder.com/512',
  imagePreview: 'https://via.placeholder.com/128',
  address: '0x7c3Ea2b7B3beFA1115aB51c09F0C9f245C500B18',
  backgroundColor: 'transparent',
  tokenURI: 'https://example.com/token/42',
  standard: 'ERC721',
  chainId: 1,
  description: 'Mock NFT for navigation dev panel testing.',
  favorite: false,
  isCurrentlyOwned: true,
} as Nft;

export const MOCK_WEBVIEW_PARAMS = {
  screen: 'SimpleWebview',
  params: {
    url: 'https://metamask.io',
    title: 'MetaMask',
  },
};

export const MOCK_ADD_BOOKMARK_PARAMS = {
  screen: 'AddBookmark',
  params: {
    title: 'MetaMask',
    url: 'https://metamask.io',
    onAddBookmark: () => {
      // Dev panel noop — real flow persists via Redux + spotlight indexing.
    },
  },
};

export const MOCK_OFFLINE_MODE_PARAMS = {
  screen: 'OfflineMode',
};

export const MOCK_NFT_DETAILS_PARAMS = {
  collectible: MOCK_NFT_COLLECTIBLE,
  source: 'mobile-nft-list' as const,
};

export const MOCK_NFT_FULL_IMAGE_PARAMS = {
  collectible: MOCK_NFT_COLLECTIBLE,
};

/**
 * Valid 12-word BIP39 mnemonic (the canonical "abandon … about" test vector)
 * so the ManualBackup steps render their word grid without crashing.
 */
export const MOCK_SEED_PHRASE_WORDS = [
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'about',
];

/**
 * SetPasswordFlow is a multi-screen native-stack navigator. To land on an inner
 * screen from the dev panel we navigate to the flow with a nested target
 * (`{ screen, params }`). Screens that read route params get dev mocks here.
 */
export const MOCK_SET_PASSWORD_FLOW_PARAMS = {
  CHOOSE_PASSWORD: { screen: 'ChoosePassword' },
  ACCOUNT_BACKUP_STEP_1: { screen: 'AccountBackupStep1' },
  ACCOUNT_BACKUP_STEP_1B: { screen: 'AccountBackupStep1B' },
  MANUAL_BACKUP_STEP_1: {
    screen: 'ManualBackupStep1',
    params: {
      seedPhrase: MOCK_SEED_PHRASE_WORDS,
      backupFlow: true,
      settingsBackup: false,
    },
  },
  MANUAL_BACKUP_STEP_2: {
    screen: 'ManualBackupStep2',
    params: { words: MOCK_SEED_PHRASE_WORDS },
  },
  MANUAL_BACKUP_STEP_3: {
    screen: 'ManualBackupStep3',
    params: { words: MOCK_SEED_PHRASE_WORDS },
  },
  OPTIN_METRICS: { screen: 'OptinMetrics' },
};

export const MOCK_PR4A_PARAMS = {
  REVEAL_PRIVATE_CREDENTIAL: { shouldUpdateNav: true },
};

/** Nested screen params for SettingsFlow screens opened via SettingsView. */
export const MOCK_SETTINGS_FLOW_PARAMS = {
  CONTACT_FORM_ADD: { mode: 'add' },
  NETWORK_DETAILS_ADD: { shouldNetworkSwitchPopToWallet: false },
  NOTIFICATION_SECTION: {
    type: 'socialAI',
    title: 'Trading Signals',
    description: 'Dev panel mock — SocialAI notification preferences',
  },
  REVEAL_PRIVATE_CREDENTIAL: MOCK_PR4A_PARAMS.REVEAL_PRIVATE_CREDENTIAL,
  MANUAL_BACKUP_STEP_1: {
    seedPhrase: MOCK_SEED_PHRASE_WORDS,
    backupFlow: true,
    settingsBackup: false,
  },
  MANUAL_BACKUP_STEP_2: { words: MOCK_SEED_PHRASE_WORDS },
  MANUAL_BACKUP_STEP_3: { words: MOCK_SEED_PHRASE_WORDS },
};

///: BEGIN:ONLY_INCLUDE_IF(snaps)
/** Minimal Filsnap-shaped snap for SnapSettings from the dev panel. */
export const MOCK_DEV_PANEL_SNAP = {
  blocked: false,
  enabled: true,
  permissionName: 'wallet_snap_npm:@chainsafe/filsnap',
  id: 'npm:@chainsafe/filsnap',
  initialPermissions: {
    'endowment:network-access': {},
    'endowment:rpc': {
      dapps: true,
      snaps: true,
    },
    snap_confirm: {},
    snap_getBip44Entropy: [{ coinType: 1 }, { coinType: 461 }],
    snap_manageState: {},
  },
  manifest: {
    version: '2.3.13' as SemVerVersion,
    proposedName: 'Filsnap (Dev Panel)',
    description: 'Mock snap for navigation dev panel.',
    repository: {
      type: 'git',
      url: 'https://github.com/Chainsafe/filsnap.git',
    },
    source: {
      shasum: 'Z7lh6iD1yjfKES/WutUyxepg5Dgp8Xjo3kivsz9vpwc=',
      location: {
        npm: {
          filePath: 'dist/bundle.js',
          packageName: '@chainsafe/filsnap',
          registry: 'https://registry.npmjs.org/',
        },
      },
    },
    initialPermissions: {
      'endowment:network-access': {},
      'endowment:rpc': {
        dapps: true,
        snaps: true,
      },
      snap_confirm: {},
      snap_getBip44Entropy: [{ coinType: 1 }, { coinType: 461 }],
      snap_manageState: {},
    },
    manifestVersion: '0.1',
  },
  status: 'running' as Status,
  version: '2.3.13' as SemVerVersion,
  versionHistory: [
    {
      version: '2.3.13',
      date: 1684964145490,
      origin: 'metamask-mobile',
    },
  ],
} as unknown as Snap;

/** SettingsView → SnapsSettingsStack → SnapSettings */
export const MOCK_SETTINGS_FLOW_SNAP_SETTINGS = {
  screen: Routes.SNAPS.SNAP_SETTINGS,
  params: {
    snap: MOCK_DEV_PANEL_SNAP,
  },
};
///: END:ONLY_INCLUDE_IF

/** Static params so RewardsHome stack screens render from the dev panel. */
export const MOCK_REWARDS_HOME_PARAMS = {
  REWARDS_BOTTOM_SHEET_MODAL: {
    title: 'Dev panel confirmation',
    description: 'Mock rewards bottom sheet for navigation testing.',
    confirmAction: {
      label: 'Confirm',
      onPress: () => {
        // Dev panel noop — real flow runs confirmAction from rewards UI.
      },
    },
    showCancelButton: true,
    cancelLabel: 'Cancel',
  },
  REWARDS_CLAIM_BOTTOM_SHEET_MODAL: {
    title: 'Dev panel claim reward',
    description: 'Mock claim sheet for navigation testing.',
    rewardId: 'dev-panel-reward-id',
    seasonRewardId: 'dev-panel-season-reward-id',
    rewardType: SeasonRewardType.GENERIC,
    isLocked: false,
    hasClaimed: false,
    icon: IconName.Lock,
  },
  REWARDS_OPTIN_ACCOUNT_GROUP_MODAL: {
    accountGroupId: 'keyring:wallet-1/ethereum',
    addressData: [
      {
        address: '0x1234567890123456789012345678901234567890',
        hasOptedIn: true,
        scopes: ['eip155:1' as CaipChainId],
        isSupported: true,
      },
      {
        address: '0x0987654321098765432109876543210987654321',
        hasOptedIn: false,
        scopes: ['eip155:1' as CaipChainId],
        isSupported: true,
      },
    ],
  },
  REWARDS_END_OF_SEASON_CLAIM_BOTTOM_SHEET: {
    rewardId: 'dev-panel-end-of-season-reward-id',
    seasonRewardId: 'dev-panel-end-of-season-season-reward-id',
    title: 'Dev panel end-of-season reward',
    description: 'Mock end-of-season claim sheet for navigation testing.',
    rewardType: SeasonRewardType.METAL_CARD,
    showEmail: 'required' as const,
    showTelegram: 'optional' as const,
  },
  REWARDS_SELECT_SHEET: {
    title: 'Select tier',
    options: [
      { key: 'bronze', label: 'Bronze', value: 'STARTER' },
      { key: 'silver', label: 'Silver', value: 'MID' },
      { key: 'platinum', label: 'Platinum', value: 'UPPER' },
    ],
    selectedValue: 'MID',
    onSelect: (_value: string) => {
      // Dev panel noop — real flow persists selection in rewards UI.
    },
  },
};

// --- PR4a TransactionsHome: dev order IDs & seed payloads ---

export const DEV_PANEL_AGGREGATOR_ORDER_ID = 'dev-panel-aggregator-order';
export const DEV_PANEL_RAMPS_ORDER_ID = 'dev-panel-ramps-order';
export const DEV_PANEL_DEPOSIT_ORDER_ID = 'dev-panel-deposit-order';
export const DEV_PANEL_SELL_ORDER_ID = 'dev-panel-sell-order';
export const DEV_PANEL_BRIDGE_TX_ID = 'dev-panel-bridge-tx';

const DEV_PANEL_FALLBACK_WALLET = '0x0000000000000000000000000000000000000001';

/** Static fallbacks when the wallet has no matching orders / bridge history. */
export const MOCK_PR4A_TRANSACTIONS_HOME_PARAMS = {
  ORDER_DETAILS: {
    orderId: DEV_PANEL_AGGREGATOR_ORDER_ID,
  },
  RAMPS_ORDER_DETAILS: {
    orderId: DEV_PANEL_RAMPS_ORDER_ID,
    showCloseButton: true,
  },
  DEPOSIT_ORDER_DETAILS: {
    orderId: DEV_PANEL_DEPOSIT_ORDER_ID,
  },
  BANK_DETAILS_STANDALONE: {
    orderId: 'dev-panel-bank-order',
    shouldUpdate: false,
  },
  SEND_TRANSACTION: {
    orderId: DEV_PANEL_SELL_ORDER_ID,
  },
} as const;

const DEV_PANEL_MOCK_SELL_ORDER_DATA = {
  id: DEV_PANEL_SELL_ORDER_ID,
  providerOrderId: DEV_PANEL_SELL_ORDER_ID,
  canBeUpdated: false,
  idHasExpired: false,
  success: false,
  isOnlyLink: false,
  paymentMethod: {
    id: 'dev-panel-payment-method',
    paymentType: 'bank-transfer',
    name: 'Instant Bank Transfer',
  },
  provider: {
    id: 'dev-panel-provider',
    name: 'Dev Panel Provider',
  },
  createdAt: Date.now(),
  fiatAmount: 100,
  totalFeesFiat: 2.5,
  cryptoAmount: '0.05',
  cryptoCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
    network: { shortName: 'Ethereum', chainId: '1' },
  },
  fiatCurrency: { symbol: 'USD', denomSymbol: '$' },
  network: '1',
  status: 'CREATED',
  orderType: 'SELL',
  walletAddress: DEV_PANEL_FALLBACK_WALLET,
  excludeFromPurchases: false,
  depositWallet: '0x0000000000000000000000000000000000000002',
} as SellOrder;

function createDevPanelMockSellFiatOrder(account: string): FiatOrder {
  return {
    id: DEV_PANEL_SELL_ORDER_ID,
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    createdAt: Date.now(),
    amount: '100',
    fee: '2.50',
    cryptoAmount: '0.05',
    currency: 'USD',
    cryptocurrency: 'ETH',
    state: FIAT_ORDER_STATES.CREATED,
    account,
    network: '1',
    excludeFromPurchases: true,
    orderType: OrderOrderTypeEnum.Sell,
    lastTimeFetched: Date.now(),
    data: {
      ...DEV_PANEL_MOCK_SELL_ORDER_DATA,
      walletAddress: account,
    },
  };
}

function createDevPanelMockBridgeTxMeta(
  txId: string,
  fromAddress: string,
): TransactionMeta {
  return {
    id: txId,
    type: TransactionType.bridge,
    status: TransactionStatus.submitted,
    chainId: '0x1',
    networkClientId: 'mainnet',
    hash: '0xdevpanelbridge0000000000000000000000000000000000000001',
    time: Date.now(),
    txParams: {
      from: fromAddress,
      to: '0x0000000000000000000000000000000000000002',
      value: '0x0',
    },
  } as TransactionMeta;
}

function createDevPanelMockBridgeHistoryItem(
  txMetaId: string,
  account: string,
): BridgeHistoryItem {
  return {
    txMetaId,
    account,
    quote: {
      requestId: 'dev-panel-bridge-request',
      srcChainId: 1,
      srcAsset: {
        chainId: 1,
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
        assetId: 'eip155:1/slip44:60',
      },
      destChainId: 10,
      destAsset: {
        chainId: 10,
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
        assetId: 'eip155:10/slip44:60',
      },
      srcTokenAmount: '1000000000000000000',
      destTokenAmount: '990000000000000000',
      minDestTokenAmount: '980000000000000000',
      feeData: {
        metabridge: {
          amount: '0',
          asset: {
            chainId: 1,
            address: '0x0000000000000000000000000000000000000000',
            decimals: 18,
            symbol: 'ETH',
            name: 'Ethereum',
            assetId: 'eip155:1/slip44:60',
          },
        },
      },
      bridgeId: 'dev-panel-bridge',
      bridges: [],
      steps: [],
    },
    status: {
      srcChain: {
        chainId: 1,
        txHash: '0xdevpanelbridge0000000000000000000000000000000000000001',
      },
      destChain: {
        chainId: 10,
        txHash: '0xdevpanelbridge0000000000000000000000000000000000000002',
      },
      status: StatusTypes.COMPLETE,
    },
    startTime: Date.now(),
    estimatedProcessingTimeInSeconds: 300,
    slippagePercentage: 0,
    hasApprovalTx: false,
  };
}

export const DEV_PANEL_MOCK_AGGREGATOR_FIAT_ORDER: FiatOrder = {
  id: DEV_PANEL_AGGREGATOR_ORDER_ID,
  provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
  createdAt: Date.now(),
  amount: '100',
  fee: '2.50',
  cryptoAmount: '0.05',
  currency: 'USD',
  cryptocurrency: 'ETH',
  state: FIAT_ORDER_STATES.COMPLETED,
  account: DEV_PANEL_FALLBACK_WALLET,
  network: '1',
  excludeFromPurchases: true,
  orderType: OrderOrderTypeEnum.Buy,
  lastTimeFetched: Date.now(),
  data: {
    id: DEV_PANEL_AGGREGATOR_ORDER_ID,
    provider: { name: 'Dev Panel Provider' },
    paymentMethod: { id: 'dev-panel-payment-method' },
    cryptoCurrency: {
      decimals: 18,
      name: 'Ethereum',
      symbol: 'ETH',
      network: { shortName: 'Ethereum', chainId: '1' },
    },
    fiatCurrency: { symbol: 'USD', denomSymbol: '$' },
    fiatAmount: 100,
    cryptoAmount: 0.05,
    status: 'COMPLETED',
  } as FiatOrder['data'],
};

const DEV_PANEL_DEPOSIT_ORDER_DATA = {
  id: DEV_PANEL_DEPOSIT_ORDER_ID,
  provider: 'transak',
  providerOrderId: 'dev-panel-deposit-provider-order',
  providerOrderLink: 'https://example.com/deposit/dev-panel',
  createdAt: Date.now(),
  status: 'COMPLETED',
  timeDescriptionPending: '1-2 days',
  fiatAmount: 100,
  fiatAmountInUsd: 100,
  feesInUsd: 2.5,
  totalFeesFiat: 2.5,
  cryptoAmount: 0.05,
  fiatCurrency: 'USD',
  cryptoCurrency: {
    assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    iconUrl: 'https://example.com/usdc.png',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    chainId: 'eip155:1',
  },
  network: { chainId: 'eip155:1', name: 'Ethereum' },
  orderType: DepositOrderType.Deposit,
  walletAddress: DEV_PANEL_FALLBACK_WALLET,
  region: {
    isoCode: 'US',
    flag: '🇺🇸',
    name: 'United States',
    currency: 'USD',
    phone: {
      prefix: '+1',
      placeholder: '(555) 123-4567',
      template: '(###) ###-####',
    },
    supported: true,
  },
  paymentDetails: [],
} as unknown as DepositOrder;

function createDevPanelMockDepositFiatOrder(account: string): FiatOrder {
  return {
    id: DEV_PANEL_DEPOSIT_ORDER_ID,
    provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
    createdAt: Date.now(),
    amount: '100',
    currency: 'USD',
    cryptoAmount: '0.05',
    cryptocurrency: 'USDC',
    fee: '2.50',
    state: FIAT_ORDER_STATES.COMPLETED,
    account,
    network: 'eip155:1',
    excludeFromPurchases: true,
    orderType: DepositOrderType.Deposit,
    lastTimeFetched: Date.now(),
    data: {
      ...DEV_PANEL_DEPOSIT_ORDER_DATA,
      walletAddress: account,
    },
  };
}

function createDevPanelMockRampsOrder(walletAddress: string): RampsOrder {
  return {
    isOnlyLink: false,
    success: true,
    cryptoAmount: '0.05',
    fiatAmount: 100,
    providerOrderId: DEV_PANEL_RAMPS_ORDER_ID,
    providerOrderLink: 'https://example.com/order/dev-panel',
    createdAt: Date.now(),
    totalFeesFiat: 2.5,
    walletAddress,
    status: RampsOrderStatus.Completed,
    provider: { id: 'paypal' },
    network: { name: 'Ethereum', chainId: 'eip155:1' },
    cryptoCurrency: {
      symbol: 'ETH',
      name: 'Ethereum',
      chainId: 'eip155:1',
    },
    fiatCurrency: { symbol: 'USD', denomSymbol: '$' },
    canBeUpdated: false,
    idHasExpired: false,
    excludeFromPurchases: true,
    timeDescriptionPending: '5-10 minutes',
    orderType: 'BUY',
  } as unknown as RampsOrder;
}

/** Mirrors stack `TransactionDetails` summary section types (ADR-0020: no cross-route import). */
const DEV_PANEL_SUMMARY_SECTION_TYPES: TransactionType[] = [
  TransactionType.musdClaim,
  TransactionType.musdConversion,
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
];

function devPanelHasTransactionType(
  transactionMeta: TransactionMeta | undefined,
  types: readonly TransactionType[],
): boolean {
  const { nestedTransactions, type } = transactionMeta ?? {};

  if (types.includes(type as TransactionType)) {
    return true;
  }

  return (
    nestedTransactions?.some((tx) =>
      types.includes(tx.type as TransactionType),
    ) ?? false
  );
}

/** Same types as `TransactionElement` stack navigation (not the modal sheet). */
const STACK_TRANSACTION_DETAILS_TYPES: TransactionType[] = [
  TransactionType.musdClaim,
  TransactionType.musdConversion,
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
  TransactionType.perpsDeposit,
  TransactionType.perpsDepositAndOrder,
  TransactionType.perpsWithdraw,
  TransactionType.predictClaim,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
];

function pickTransactionIdForStackDetails(
  transactions: TransactionMeta[],
): string | undefined {
  if (transactions.length === 0) {
    return undefined;
  }

  const summaryMatch = transactions.find((tx) =>
    devPanelHasTransactionType(tx, DEV_PANEL_SUMMARY_SECTION_TYPES),
  );
  if (summaryMatch) {
    return summaryMatch.id;
  }

  const stackMatch = transactions.find((tx) =>
    devPanelHasTransactionType(tx, STACK_TRANSACTION_DETAILS_TYPES),
  );
  if (stackMatch) {
    return stackMatch.id;
  }

  return transactions[transactions.length - 1]?.id;
}

export interface Pr4aTransactionsHomeContext {
  rampsOrders: RampsOrder[];
  fiatOrders: FiatOrder[];
  transactions: TransactionMeta[];
  bridgeHistory: Record<string, BridgeHistoryItem>;
}

export function resolvePr4aTransactionsHomeParams(
  routeName: string,
  context: Pr4aTransactionsHomeContext,
): Record<string, unknown> | null {
  switch (routeName) {
    case Routes.RAMP.ORDER_DETAILS: {
      const aggregatorOrder = context.fiatOrders.find(
        (order) => order.provider === FIAT_ORDER_PROVIDERS.AGGREGATOR,
      );
      return aggregatorOrder
        ? { orderId: aggregatorOrder.id }
        : { ...MOCK_PR4A_TRANSACTIONS_HOME_PARAMS.ORDER_DETAILS };
    }
    case Routes.RAMP.RAMPS_ORDER_DETAILS: {
      const order = context.rampsOrders[0];
      return order
        ? {
            orderId: order.providerOrderId,
            showCloseButton: true,
          }
        : { ...MOCK_PR4A_TRANSACTIONS_HOME_PARAMS.RAMPS_ORDER_DETAILS };
    }
    case Routes.DEPOSIT.ORDER_DETAILS: {
      const depositOrder = context.fiatOrders.find(
        (order) => order.provider === FIAT_ORDER_PROVIDERS.DEPOSIT,
      );
      return depositOrder
        ? { orderId: depositOrder.id }
        : { ...MOCK_PR4A_TRANSACTIONS_HOME_PARAMS.DEPOSIT_ORDER_DETAILS };
    }
    case Routes.RAMP.BANK_DETAILS_STANDALONE: {
      const order = context.rampsOrders[0];
      return order
        ? { orderId: order.providerOrderId, shouldUpdate: false }
        : { ...MOCK_PR4A_TRANSACTIONS_HOME_PARAMS.BANK_DETAILS_STANDALONE };
    }
    case Routes.RAMP.SEND_TRANSACTION: {
      const sellOrder = context.fiatOrders.find(
        (order) =>
          order.provider === FIAT_ORDER_PROVIDERS.AGGREGATOR &&
          order.orderType === OrderOrderTypeEnum.Sell,
      );
      return sellOrder
        ? { orderId: sellOrder.id }
        : { ...MOCK_PR4A_TRANSACTIONS_HOME_PARAMS.SEND_TRANSACTION };
    }
    case Routes.TRANSACTION_DETAILS: {
      const transactionId = pickTransactionIdForStackDetails(
        context.transactions,
      );
      return transactionId ? { transactionId } : null;
    }
    case Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS: {
      for (let i = context.transactions.length - 1; i >= 0; i -= 1) {
        const evmTxMeta = context.transactions[i];
        if (context.bridgeHistory[evmTxMeta.id]) {
          return { evmTxMeta };
        }
      }
      return null;
    }
    default:
      return null;
  }
}

export function seedDevPanelAggregatorOrder(
  fiatOrders: FiatOrder[],
  dispatch: (action: ReturnType<typeof addFiatOrder>) => void,
): string {
  const existingAggregatorOrder = fiatOrders.find(
    (order) => order.provider === FIAT_ORDER_PROVIDERS.AGGREGATOR,
  );

  if (existingAggregatorOrder) {
    return existingAggregatorOrder.id;
  }

  dispatch(addFiatOrder(DEV_PANEL_MOCK_AGGREGATOR_FIAT_ORDER));
  return DEV_PANEL_AGGREGATOR_ORDER_ID;
}

export function seedDevPanelRampsOrder(
  rampsOrders: RampsOrder[],
  walletAddress: string | undefined,
): { orderId: string; showCloseButton: true } {
  const existingOrder = rampsOrders[0];

  if (existingOrder?.providerOrderId) {
    return {
      orderId: existingOrder.providerOrderId,
      showCloseButton: true,
    };
  }

  const address = walletAddress ?? DEV_PANEL_FALLBACK_WALLET;
  Engine.context.RampsController.addOrder(
    createDevPanelMockRampsOrder(address),
  );

  return {
    orderId: DEV_PANEL_RAMPS_ORDER_ID,
    showCloseButton: true,
  };
}

export function seedDevPanelDepositOrder(
  fiatOrders: FiatOrder[],
  dispatch: (action: ReturnType<typeof addFiatOrder>) => void,
  account: string | undefined,
): string {
  const existingDepositOrder = fiatOrders.find(
    (order) => order.provider === FIAT_ORDER_PROVIDERS.DEPOSIT,
  );

  if (existingDepositOrder) {
    return existingDepositOrder.id;
  }

  const walletAccount = account ?? DEV_PANEL_FALLBACK_WALLET;
  dispatch(addFiatOrder(createDevPanelMockDepositFiatOrder(walletAccount)));
  return DEV_PANEL_DEPOSIT_ORDER_ID;
}

export function seedDevPanelSellOrder(
  fiatOrders: FiatOrder[],
  dispatch: (action: ReturnType<typeof addFiatOrder>) => void,
  account: string | undefined,
): string {
  const existingSellOrder = fiatOrders.find(
    (order) =>
      order.provider === FIAT_ORDER_PROVIDERS.AGGREGATOR &&
      order.orderType === OrderOrderTypeEnum.Sell,
  );

  if (existingSellOrder) {
    return existingSellOrder.id;
  }

  const walletAccount = account ?? DEV_PANEL_FALLBACK_WALLET;
  dispatch(addFiatOrder(createDevPanelMockSellFiatOrder(walletAccount)));
  return DEV_PANEL_SELL_ORDER_ID;
}

export function seedDevPanelBridgeTransaction(
  account: string | undefined,
  bridgeHistory: Record<string, BridgeHistoryItem>,
  transactions: TransactionMeta[],
): { evmTxMeta: TransactionMeta } {
  for (let i = transactions.length - 1; i >= 0; i -= 1) {
    const evmTxMeta = transactions[i];
    if (bridgeHistory[evmTxMeta.id]) {
      return { evmTxMeta };
    }
  }

  const walletAccount = account ?? DEV_PANEL_FALLBACK_WALLET;
  const existingDevPanelHistory = bridgeHistory[DEV_PANEL_BRIDGE_TX_ID];
  if (existingDevPanelHistory) {
    const existingTx = transactions.find(
      (tx) => tx.id === DEV_PANEL_BRIDGE_TX_ID,
    );
    return {
      evmTxMeta:
        existingTx ??
        createDevPanelMockBridgeTxMeta(DEV_PANEL_BRIDGE_TX_ID, walletAccount),
    };
  }

  const evmTxMeta = createDevPanelMockBridgeTxMeta(
    DEV_PANEL_BRIDGE_TX_ID,
    walletAccount,
  );
  const historyItem = createDevPanelMockBridgeHistoryItem(
    DEV_PANEL_BRIDGE_TX_ID,
    walletAccount,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Engine.context.BridgeStatusController as any).update(
    (state: { txHistory: Record<string, BridgeHistoryItem> }) => {
      state.txHistory[DEV_PANEL_BRIDGE_TX_ID] = historyItem;
    },
  );

  const hasDevPanelTx = transactions.some(
    (tx) => tx.id === DEV_PANEL_BRIDGE_TX_ID,
  );
  if (!hasDevPanelTx) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Engine.context.TransactionController as any).update(
      (state: { transactions: TransactionMeta[] }) => {
        state.transactions.push(evmTxMeta);
      },
    );
  }

  return { evmTxMeta };
}
