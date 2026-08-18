import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type { CaipChainId } from '@metamask/utils';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../app/constants/on-ramp';
import type { FiatOrder } from '../../../app/reducers/fiatOrders/types';
import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import type { PredictActivity } from '../../../app/components/UI/Predict/types';
import {
  FillType,
  PerpsOrderTransactionStatus,
  PerpsOrderTransactionStatusType,
  type PerpsTransaction,
} from '../../../app/components/UI/Perps/types/transactionHistory';
import {
  mapPerpsTransaction,
  type ActivityListItem,
} from '../../../app/util/activity-adapters';

export const ACTIVITY_CV_ACCOUNT = '0x0000000000000000000000000000000000000001';

export const ACTIVITY_CV_RECIPIENT =
  '0x80181d3ba89220cdb80234fc7aa19d5cc56229cc';

/** Mainnet USDC — used for ERC-20 send/receive Activity CV fixtures. */
export const ACTIVITY_CV_USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

/** Mainnet mUSD — used for Activity Details send/receive CV fixtures. */
export const ACTIVITY_CV_MUSD = '0xAcA92E438df0B2401fF60dA7E4337B687a2435DA';

/** Mainnet USDT — used for Activity Details approval CV fixtures. */
export const ACTIVITY_CV_USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

/** Hashes for Activity Mainnet↔Linea network-filter CV (Core UX Test 1). */
export const MAINNET_ACTIVITY_HASH = '0xactivitycvmainnettx';
export const LINEA_ACTIVITY_HASH = '0xactivitycvlineatx';

/** TokenRates override so Activity Details Total can resolve mUSD fiat. */
export const activityMusdTokenRatesOverride = {
  engine: {
    backgroundState: {
      TokenRatesController: {
        marketData: {
          '0x1': {
            [ACTIVITY_CV_MUSD]: { price: 1 },
          },
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

interface LocalSendOverrides {
  id?: string;
  hash?: string;
  chainId?: string;
  time?: number;
}

export const buildConfirmedLocalSendTransaction = (
  overrides: LocalSendOverrides = {},
): TransactionMeta =>
  ({
    id: overrides.id ?? 'activity-cv-confirmed-send',
    hash: overrides.hash ?? '0xactivitycvconfirmedsend',
    chainId: overrides.chainId ?? '0x1',
    status: TransactionStatus.confirmed,
    time: overrides.time ?? 1_716_367_781_000,
    type: TransactionType.simpleSend,
    txParams: {
      from: ACTIVITY_CV_ACCOUNT,
      to: ACTIVITY_CV_RECIPIENT,
      value: '0xde0b6b3a7640000',
      nonce: '0x0',
    },
    txReceipt: { status: '0x1' },
  }) as unknown as TransactionMeta;

/** Confirmed ERC-20 USDC send (1 USDC) for ActivityScreen transaction-row CV. */
export const buildConfirmedLocalUsdcSendTransaction = (): TransactionMeta =>
  ({
    id: 'activity-cv-confirmed-usdc-send',
    hash: '0xactivitycvconfirmedusdcsend',
    chainId: '0x1',
    status: TransactionStatus.confirmed,
    time: 1_716_367_783_000,
    type: TransactionType.tokenMethodTransfer,
    transferInformation: {
      amount: '1000000',
      contractAddress: ACTIVITY_CV_USDC,
      decimals: 6,
      symbol: 'USDC',
    },
    txParams: {
      from: ACTIVITY_CV_ACCOUNT,
      to: ACTIVITY_CV_USDC,
      value: '0x0',
      nonce: '0x2',
      data: `0xa9059cbb000000000000000000000000${ACTIVITY_CV_RECIPIENT.slice(
        2,
      ).toLowerCase()}00000000000000000000000000000000000000000000000000000000000f4240`,
    },
    txReceipt: { status: '0x1' },
  }) as unknown as TransactionMeta;

/**
 * Confirmed ERC-20 mUSD send (1 mUSD) with receipt gas for Activity Details
 * fee / total CV.
 */
export const buildConfirmedLocalMusdSendTransaction = (): TransactionMeta =>
  ({
    id: 'activity-cv-confirmed-musd-send',
    hash: '0xactivitycvconfirmedmusdsend',
    chainId: '0x1',
    status: TransactionStatus.confirmed,
    time: 1_716_367_784_000,
    type: TransactionType.tokenMethodTransfer,
    transferInformation: {
      amount: '1000000',
      contractAddress: ACTIVITY_CV_MUSD,
      decimals: 6,
      symbol: 'mUSD',
    },
    txParams: {
      from: ACTIVITY_CV_ACCOUNT,
      to: ACTIVITY_CV_MUSD,
      value: '0x0',
      nonce: '0x3',
      data: `0xa9059cbb000000000000000000000000${ACTIVITY_CV_RECIPIENT.slice(
        2,
      ).toLowerCase()}00000000000000000000000000000000000000000000000000000000000f4240`,
    },
    txReceipt: {
      status: '0x1',
      gasUsed: '0x5208',
      effectiveGasPrice: '0x3b9aca00',
    },
  }) as unknown as TransactionMeta;

const buildApproveCalldata = (spender: string, amount: bigint): string =>
  `0x095ea7b3${spender.slice(2).toLowerCase().padStart(64, '0')}${amount
    .toString(16)
    .padStart(64, '0')}`;

/** ERC-20 `increaseAllowance(spender, amount)` — selector `0x39509351`. */
const buildIncreaseAllowanceCalldata = (
  spender: string,
  amount: bigint,
): string =>
  `0x39509351${spender.slice(2).toLowerCase().padStart(64, '0')}${amount
    .toString(16)
    .padStart(64, '0')}`;

/** Confirmed USDC approve (100 USDC) for ActivityScreen transaction-row CV. */
export const buildConfirmedLocalUsdcApproveTransaction = (): TransactionMeta =>
  ({
    id: 'activity-cv-confirmed-usdc-approve',
    hash: '0xactivitycvconfirmedusdcapprove',
    chainId: '0x1',
    status: TransactionStatus.confirmed,
    time: 1_716_367_785_000,
    type: TransactionType.tokenMethodApprove,
    transferInformation: {
      contractAddress: ACTIVITY_CV_USDC,
      decimals: 6,
      symbol: 'USDC',
    },
    txParams: {
      from: ACTIVITY_CV_ACCOUNT,
      to: ACTIVITY_CV_USDC,
      value: '0x0',
      nonce: '0x4',
      data: buildApproveCalldata(ACTIVITY_CV_RECIPIENT, 100_000_000n),
    },
    txReceipt: { status: '0x1' },
  }) as unknown as TransactionMeta;

/** Confirmed USDC increaseAllowance (100 USDC) for ActivityScreen CV. */
export const buildConfirmedLocalUsdcIncreaseAllowanceTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-confirmed-usdc-increase-allowance',
      hash: '0xactivitycvconfirmedusdcincrease',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_786_000,
      type: TransactionType.tokenMethodIncreaseAllowance,
      transferInformation: {
        contractAddress: ACTIVITY_CV_USDC,
        decimals: 6,
        symbol: 'USDC',
      },
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_USDC,
        value: '0x0',
        nonce: '0x5',
        data: buildIncreaseAllowanceCalldata(
          ACTIVITY_CV_RECIPIENT,
          100_000_000n,
        ),
      },
      txReceipt: { status: '0x1' },
    }) as unknown as TransactionMeta;

const MAX_UINT256 = 2n ** 256n - 1n;

/** Confirmed unlimited USDC approve for ActivityScreen transaction-row CV. */
export const buildConfirmedLocalUsdcUnlimitedApproveTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-confirmed-usdc-unlimited-approve',
      hash: '0xactivitycvconfirmedusdcunlimited',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_787_000,
      type: TransactionType.tokenMethodApprove,
      transferInformation: {
        contractAddress: ACTIVITY_CV_USDC,
        decimals: 6,
        symbol: 'USDC',
      },
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_USDC,
        value: '0x0',
        nonce: '0x6',
        data: buildApproveCalldata(ACTIVITY_CV_RECIPIENT, MAX_UINT256),
      },
      txReceipt: { status: '0x1' },
    }) as unknown as TransactionMeta;

/** Confirmed USDC revoke (`approve(spender, 0)`) for ActivityScreen CV. */
export const buildConfirmedLocalUsdcRevokeTransaction = (): TransactionMeta =>
  ({
    id: 'activity-cv-confirmed-usdc-revoke',
    hash: '0xactivitycvconfirmedusdcrevoke',
    chainId: '0x1',
    status: TransactionStatus.confirmed,
    time: 1_716_367_788_000,
    type: TransactionType.tokenMethodApprove,
    transferInformation: {
      contractAddress: ACTIVITY_CV_USDC,
      decimals: 6,
      symbol: 'USDC',
    },
    txParams: {
      from: ACTIVITY_CV_ACCOUNT,
      to: ACTIVITY_CV_USDC,
      value: '0x0',
      nonce: '0x7',
      data: buildApproveCalldata(ACTIVITY_CV_RECIPIENT, 0n),
    },
    txReceipt: { status: '0x1' },
  }) as unknown as TransactionMeta;

/** Mainnet NFT collection used for ActivityScreen mint CV. */
export const ACTIVITY_CV_NFT_CONTRACT =
  '0x239fd4b0c4db49fa8660e65b97619d43d0e0a79d';

export const ACTIVITY_CV_NFT_COLLECTION_NAME = 'CryptoPunks';

/**
 * Confirmed zero-value contract interaction for ActivityScreen transaction-row CV.
 * Uses a non-wrap method id so it stays `contractInteraction` (no token amount).
 */
export const buildConfirmedLocalContractInteractionTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-confirmed-contract-interaction',
      hash: '0xactivitycvconfirmedcontract',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_786_000,
      type: TransactionType.contractInteraction,
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_RECIPIENT,
        value: '0x0',
        nonce: '0x5',
        data: '0xabcdef12',
      },
      txReceipt: { status: '0x1' },
    }) as unknown as TransactionMeta;

const ACTIVITY_CV_GAS_RECEIPT = {
  status: '0x1',
  gasUsed: '0x5208',
  effectiveGasPrice: '0x3b9aca00',
} as const;

/**
 * Contract interaction with receipt gas for Activity Details fee / total CV.
 */
export const buildConfirmedLocalContractInteractionWithFeesTransaction =
  (): TransactionMeta => {
    const base = buildConfirmedLocalContractInteractionTransaction();
    return {
      ...base,
      id: 'activity-cv-confirmed-contract-interaction-fees',
      hash: '0xactivitycvconfirmedcontractfees',
      txParams: {
        ...base.txParams,
        nonce: '0xa',
      },
      txReceipt: { ...ACTIVITY_CV_GAS_RECEIPT },
    } as unknown as TransactionMeta;
  };

/** Confirmed unlimited USDT approve with gas for Activity Details CV. */
export const buildConfirmedLocalUsdtUnlimitedApproveTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-confirmed-usdt-unlimited-approve',
      hash: '0xactivitycvconfirmedusdtunlimited',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_791_000,
      type: TransactionType.tokenMethodApprove,
      transferInformation: {
        contractAddress: ACTIVITY_CV_USDT,
        decimals: 6,
        symbol: 'USDT',
      },
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_USDT,
        value: '0x0',
        nonce: '0xb',
        data: buildApproveCalldata(ACTIVITY_CV_RECIPIENT, MAX_UINT256),
      },
      txReceipt: { ...ACTIVITY_CV_GAS_RECEIPT },
    }) as unknown as TransactionMeta;

/** Confirmed USDT increaseAllowance (100 USDT) with gas for Activity Details CV. */
export const buildConfirmedLocalUsdtIncreaseAllowanceTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-confirmed-usdt-increase-allowance',
      hash: '0xactivitycvconfirmedusdtincrease',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_792_000,
      type: TransactionType.tokenMethodIncreaseAllowance,
      transferInformation: {
        contractAddress: ACTIVITY_CV_USDT,
        decimals: 6,
        symbol: 'USDT',
      },
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_USDT,
        value: '0x0',
        nonce: '0xc',
        data: buildIncreaseAllowanceCalldata(
          ACTIVITY_CV_RECIPIENT,
          100_000_000n,
        ),
      },
      txReceipt: { ...ACTIVITY_CV_GAS_RECEIPT },
    }) as unknown as TransactionMeta;

/**
 * Confirmed EIP-7702 smart account upgrade with gas for Activity Details CV.
 */
export const buildConfirmedLocalSmartAccountUpgradeTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-confirmed-smart-account-upgrade',
      hash: '0xactivitycvconfirmedsmartaccountupgrade',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_793_000,
      type: TransactionType.batch,
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_RECIPIENT,
        value: '0x0',
        nonce: '0xd',
        authorizationList: [{ address: ACTIVITY_CV_RECIPIENT }],
      },
      txReceipt: { ...ACTIVITY_CV_GAS_RECEIPT },
    }) as unknown as TransactionMeta;

/** Confirmed cross-token bridge (ETH → USDC) for ActivityScreen transaction-row CV. */
export const buildConfirmedLocalBridgeTransaction = (): TransactionMeta =>
  ({
    id: 'activity-cv-confirmed-bridge',
    hash: '0xactivitycvconfirmedbridge',
    chainId: '0x1',
    status: TransactionStatus.confirmed,
    time: 1_716_367_784_000,
    type: TransactionType.bridge,
    txParams: {
      from: ACTIVITY_CV_ACCOUNT,
      to: ACTIVITY_CV_USDC,
      value: '0xde0b6b3a7640000',
      nonce: '0x3',
    },
    txReceipt: { status: '0x1' },
  }) as unknown as TransactionMeta;

/**
 * BridgeStatusController.txHistory for
 * {@link buildConfirmedLocalBridgeTransaction} (ETH → USDC, both amounts).
 */
export const activityCvBridgeHistoryEntry = {
  txMetaId: 'activity-cv-confirmed-bridge',
  account: ACTIVITY_CV_ACCOUNT,
  quote: {
    srcChainId: 1,
    destChainId: 59144,
    srcAsset: {
      symbol: 'ETH',
      decimals: 18,
      assetId: 'eip155:1/slip44:60',
    },
    destAsset: {
      symbol: 'USDC',
      decimals: 6,
      assetId: `eip155:59144/erc20:${ACTIVITY_CV_USDC.toLowerCase()}`,
    },
    srcTokenAmount: '1000000000000000000',
    destTokenAmount: '1000000',
  },
  status: {
    srcChain: {
      chainId: 1,
      txHash: '0xactivitycvconfirmedbridge',
    },
    destChain: {
      chainId: 59144,
      txHash: '0xactivitycvbridgedest',
    },
  },
  startTime: 1_716_367_784_000,
  estimatedProcessingTimeInSeconds: 0,
  slippagePercentage: 0,
};

/**
 * Cross-chain swap (ETH Ethereum → USDC Linea). Maps as `swap` ("Swapped").
 */
export const buildConfirmedLocalCrossChainSwapTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-confirmed-cross-chain-swap',
      hash: '0xactivitycvcrosschainswap',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_789_000,
      type: TransactionType.swap,
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_USDC,
        value: '0xde0b6b3a7640000',
        nonce: '0x8',
      },
      txReceipt: { status: '0x1' },
    }) as unknown as TransactionMeta;

/** Quote for {@link buildConfirmedLocalCrossChainSwapTransaction}. */
export const activityCvCrossChainSwapBridgeHistoryEntry = {
  txMetaId: 'activity-cv-confirmed-cross-chain-swap',
  account: ACTIVITY_CV_ACCOUNT,
  quote: {
    srcChainId: 1,
    destChainId: 59144,
    srcAsset: {
      symbol: 'ETH',
      decimals: 18,
      assetId: 'eip155:1/slip44:60',
    },
    destAsset: {
      symbol: 'USDC',
      decimals: 6,
      assetId: `eip155:59144/erc20:${ACTIVITY_CV_USDC.toLowerCase()}`,
    },
    srcTokenAmount: '1000000000000000000',
    destTokenAmount: '1000000',
  },
  status: {
    srcChain: {
      chainId: 1,
      txHash: '0xactivitycvcrosschainswap',
    },
    destChain: {
      chainId: 59144,
      txHash: '0xactivitycvcrosschainswapdest',
    },
  },
  startTime: 1_716_367_789_000,
  estimatedProcessingTimeInSeconds: 0,
  slippagePercentage: 0,
};

/**
 * Submitted cross-chain swap for ActivityDetails pending status CV.
 * Same quote shape as the confirmed fixture; status is still in-flight.
 */
export const buildPendingLocalCrossChainSwapTransaction = (): TransactionMeta =>
  ({
    id: 'activity-cv-pending-cross-chain-swap',
    hash: '0xactivitycvpendingcrosschainswap',
    chainId: '0x1',
    status: TransactionStatus.submitted,
    time: 1_716_367_789_500,
    type: TransactionType.swap,
    txParams: {
      from: ACTIVITY_CV_ACCOUNT,
      to: ACTIVITY_CV_USDC,
      value: '0xde0b6b3a7640000',
      nonce: '0x9',
    },
  }) as unknown as TransactionMeta;

/** Quote for {@link buildPendingLocalCrossChainSwapTransaction}. */
export const activityCvPendingCrossChainSwapBridgeHistoryEntry = {
  ...activityCvCrossChainSwapBridgeHistoryEntry,
  txMetaId: 'activity-cv-pending-cross-chain-swap',
  status: {
    srcChain: {
      chainId: 1,
      txHash: '0xactivitycvpendingcrosschainswap',
    },
    destChain: {
      chainId: 59144,
    },
  },
  startTime: 1_716_367_789_500,
};

/** Solana mainnet scope — Activity Details EVM→nonEVM bridge and non-EVM fiat CV. */
export const ACTIVITY_CV_SOLANA_CHAIN_ID =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

/**
 * Same-chain ETH → mUSD swap with gas for Activity Details dual-header CV.
 */
export const buildConfirmedLocalEthToMusdSwapTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-confirmed-eth-musd-swap',
      hash: '0xactivitycvethmusdswap',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_794_000,
      type: TransactionType.swap,
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_MUSD,
        value: '0xde0b6b3a7640000',
        nonce: '0xe',
      },
      txReceipt: { ...ACTIVITY_CV_GAS_RECEIPT },
    }) as unknown as TransactionMeta;

/** Quote for {@link buildConfirmedLocalEthToMusdSwapTransaction}. */
export const activityCvEthToMusdSwapHistoryEntry = {
  txMetaId: 'activity-cv-confirmed-eth-musd-swap',
  account: ACTIVITY_CV_ACCOUNT,
  quote: {
    srcChainId: 1,
    destChainId: 1,
    srcAsset: {
      symbol: 'ETH',
      decimals: 18,
      assetId: 'eip155:1/slip44:60',
    },
    destAsset: {
      symbol: 'mUSD',
      decimals: 6,
      assetId: `eip155:1/erc20:${ACTIVITY_CV_MUSD.toLowerCase()}`,
    },
    srcTokenAmount: '1000000000000000000',
    destTokenAmount: '2500000000',
  },
  status: {
    srcChain: {
      chainId: 1,
      txHash: '0xactivitycvethmusdswap',
    },
    destChain: {
      chainId: 1,
      txHash: '0xactivitycvethmusdswap',
    },
  },
  startTime: 1_716_367_794_000,
  estimatedProcessingTimeInSeconds: 0,
  slippagePercentage: 0,
};

/**
 * Confirmed mUSD conversion (USDC → mUSD) with gas for Activity Details CV.
 * Source leg comes from BridgeStatusController quote enrichment; destination
 * amount is parsed from the ERC-20 transfer calldata.
 */
export const buildConfirmedLocalMusdConversionTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-confirmed-musd-conversion',
      hash: '0xactivitycvmusdconversion',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_795_000,
      type: TransactionType.musdConversion,
      transferInformation: {
        contractAddress: ACTIVITY_CV_MUSD,
        decimals: 6,
        symbol: 'mUSD',
      },
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_MUSD,
        value: '0x0',
        nonce: '0xf',
        data: `0xa9059cbb000000000000000000000000${ACTIVITY_CV_ACCOUNT.slice(
          2,
        ).toLowerCase()}00000000000000000000000000000000000000000000000000000000004c4b40`,
      },
      txReceipt: { ...ACTIVITY_CV_GAS_RECEIPT },
    }) as unknown as TransactionMeta;

/**
 * Quote used only to enrich the convert source (USDC) leg — destination is
 * resolved from the conversion calldata / transferInformation.
 */
export const activityCvMusdConversionHistoryEntry = {
  txMetaId: 'activity-cv-confirmed-musd-conversion',
  account: ACTIVITY_CV_ACCOUNT,
  quote: {
    srcChainId: 1,
    destChainId: 1,
    srcAsset: {
      symbol: 'USDC',
      decimals: 6,
      assetId: `eip155:1/erc20:${ACTIVITY_CV_USDC.toLowerCase()}`,
    },
    destAsset: {
      symbol: 'mUSD',
      decimals: 6,
      assetId: `eip155:1/erc20:${ACTIVITY_CV_MUSD.toLowerCase()}`,
    },
    srcTokenAmount: '5010000',
    destTokenAmount: '5000000',
  },
  status: {
    srcChain: {
      chainId: 1,
      txHash: '0xactivitycvmusdconversion',
    },
    destChain: {
      chainId: 1,
      txHash: '0xactivitycvmusdconversion',
    },
  },
  startTime: 1_716_367_795_000,
  estimatedProcessingTimeInSeconds: 0,
  slippagePercentage: 0,
};

/**
 * Bridge ETH Mainnet → mUSD Linea with gas for Activity Details CV.
 */
export const buildConfirmedLocalBridgeEthToMusdLineaTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-confirmed-bridge-eth-musd-linea',
      hash: '0xactivitycvbridgeethmusdlinea',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_796_000,
      type: TransactionType.bridge,
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_MUSD,
        value: '0xde0b6b3a7640000',
        nonce: '0x10',
      },
      txReceipt: { ...ACTIVITY_CV_GAS_RECEIPT },
    }) as unknown as TransactionMeta;

/** Quote for {@link buildConfirmedLocalBridgeEthToMusdLineaTransaction}. */
export const activityCvBridgeEthToMusdLineaHistoryEntry = {
  txMetaId: 'activity-cv-confirmed-bridge-eth-musd-linea',
  account: ACTIVITY_CV_ACCOUNT,
  quote: {
    srcChainId: 1,
    destChainId: 59144,
    srcAsset: {
      symbol: 'ETH',
      decimals: 18,
      assetId: 'eip155:1/slip44:60',
    },
    destAsset: {
      symbol: 'mUSD',
      decimals: 6,
      assetId: `eip155:59144/erc20:${ACTIVITY_CV_MUSD.toLowerCase()}`,
    },
    srcTokenAmount: '1000000000000000000',
    destTokenAmount: '2500000000',
  },
  status: {
    srcChain: {
      chainId: 1,
      txHash: '0xactivitycvbridgeethmusdlinea',
    },
    destChain: {
      chainId: 59144,
      txHash: '0xactivitycvbridgeethmusdlineadest',
    },
  },
  startTime: 1_716_367_796_000,
  estimatedProcessingTimeInSeconds: 0,
  slippagePercentage: 0,
};

/**
 * Bridge ETH Mainnet → SOL Solana with gas for Activity Details dual-explorer CV.
 */
export const buildConfirmedLocalBridgeEthToSolTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-confirmed-bridge-eth-sol',
      hash: '0xactivitycvbridgeethsol',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_797_000,
      type: TransactionType.bridge,
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_RECIPIENT,
        value: '0xde0b6b3a7640000',
        nonce: '0x11',
      },
      txReceipt: { ...ACTIVITY_CV_GAS_RECEIPT },
    }) as unknown as TransactionMeta;

/** Quote for {@link buildConfirmedLocalBridgeEthToSolTransaction}. */
export const activityCvBridgeEthToSolHistoryEntry = {
  txMetaId: 'activity-cv-confirmed-bridge-eth-sol',
  account: ACTIVITY_CV_ACCOUNT,
  quote: {
    srcChainId: 1,
    destChainId: ACTIVITY_CV_SOLANA_CHAIN_ID,
    srcAsset: {
      symbol: 'ETH',
      decimals: 18,
      assetId: 'eip155:1/slip44:60',
    },
    destAsset: {
      symbol: 'SOL',
      decimals: 9,
      assetId: `${ACTIVITY_CV_SOLANA_CHAIN_ID}/slip44:501`,
    },
    srcTokenAmount: '1000000000000000000',
    destTokenAmount: '1000000000',
  },
  status: {
    srcChain: {
      chainId: 1,
      txHash: '0xactivitycvbridgeethsol',
    },
    destChain: {
      chainId: ACTIVITY_CV_SOLANA_CHAIN_ID,
      txHash: 'activitycvbridgeethsoldest',
    },
  },
  startTime: 1_716_367_797_000,
  estimatedProcessingTimeInSeconds: 0,
  slippagePercentage: 0,
};

/** TokenRates so convert Total can resolve USDC fiat (mUSD already covered). */
export const activityUsdcTokenRatesOverride = {
  engine: {
    backgroundState: {
      TokenRatesController: {
        marketData: {
          '0x1': {
            [ACTIVITY_CV_USDC]: { price: 1 },
            [ACTIVITY_CV_MUSD]: { price: 1 },
          },
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

const ERC20_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const addressTopic = (address: string): string =>
  `0x${address.slice(2).toLowerCase().padStart(64, '0')}`;

/** Merkl distributor that emits the mUSD Transfer on claim (see Earn musd utils). */
const MERKL_DISTRIBUTOR_ADDRESS = '0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae';

/**
 * Confirmed Merkl mUSD claim on Linea with receipt payout.
 * Claims always settle on Linea.
 */
export const buildConfirmedLocalMusdClaimTransaction = (): TransactionMeta =>
  ({
    id: 'activity-cv-confirmed-musd-claim',
    hash: '0xactivitycvconfirmedmusdclaim',
    chainId: '0xe708',
    status: TransactionStatus.confirmed,
    time: 1_716_367_798_000,
    type: TransactionType.musdClaim,
    txParams: {
      from: ACTIVITY_CV_ACCOUNT,
      to: MERKL_DISTRIBUTOR_ADDRESS,
      value: '0x0',
      nonce: '0x12',
    },
    txReceipt: {
      ...ACTIVITY_CV_GAS_RECEIPT,
      logs: [
        {
          address: ACTIVITY_CV_MUSD,
          data: '0x0f4240',
          topics: [
            ERC20_TRANSFER_TOPIC,
            addressTopic(MERKL_DISTRIBUTOR_ADDRESS),
            addressTopic(ACTIVITY_CV_ACCOUNT),
          ],
        },
      ],
    },
  }) as unknown as TransactionMeta;

/**
 * Confirmed staking deposit (1 ETH) with gas for Activity Details stake CV.
 */
export const buildConfirmedLocalStakingDepositTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-confirmed-staking-deposit',
      hash: '0xactivitycvconfirmedstakingdeposit',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_799_000,
      type: TransactionType.stakingDeposit,
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_ACCOUNT,
        value: '0xde0b6b3a7640000',
        nonce: '0x13',
      },
      txReceipt: { ...ACTIVITY_CV_GAS_RECEIPT },
    }) as unknown as TransactionMeta;

/** TokenRates so Linea claim Total can resolve mUSD fiat. */
export const activityLineaMusdTokenRatesOverride = {
  engine: {
    backgroundState: {
      TokenRatesController: {
        marketData: {
          '0xe708': {
            [ACTIVITY_CV_MUSD.toLowerCase()]: { price: 1 },
            [ACTIVITY_CV_MUSD]: { price: 1 },
          },
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

/** Earn/staking pool used as the DEPOSIT counterpart. */
export const ACTIVITY_CV_DEPOSIT_CONTRACT =
  '0x00000000219ab540356cbb839cbe05303d7705fa';

export const ACTIVITY_CV_DEPOSIT_USDC_HASH = '0xactivitycvdepositusdc';
export const ACTIVITY_CV_DEPOSIT_USDC_TIMESTAMP_MS = 1_716_367_799_000;

export const buildPendingLocalSendTransaction = (): TransactionMeta =>
  ({
    id: 'activity-cv-pending-send',
    hash: '0xactivitycvpendingsend',
    chainId: '0x1',
    status: TransactionStatus.submitted,
    time: 1_716_367_782_000,
    type: TransactionType.simpleSend,
    txParams: {
      from: ACTIVITY_CV_ACCOUNT,
      to: ACTIVITY_CV_RECIPIENT,
      value: '0xde0b6b3a7640000',
      nonce: '0x1',
    },
  }) as unknown as TransactionMeta;

/** Market question used as subtitle on Predict trade/claim Activity CV rows. */
export const ACTIVITY_CV_PREDICT_MARKET_TITLE =
  'Will Spain win the 2026 FIFA World Cup?';

const ACTIVITY_CV_PREDICT_MARKET_ICON = 'https://example.com/spain.png';

/** ERC-20 `transfer(to, amount)` calldata for Predict deposit/withdraw batches. */
const buildErc20TransferCalldata = (to: string, amount: bigint): string =>
  `0xa9059cbb${to.slice(2).toLowerCase().padStart(64, '0')}${amount
    .toString(16)
    .padStart(64, '0')}`;

/** 4,000 USDC (6 decimals) — funded / withdrawal CV fixtures. */
const ACTIVITY_CV_PREDICT_USDC_AMOUNT = 4_000_000_000n;

export const ACTIVITY_CV_PREDICT_DEPOSIT_ID = 'activity-cv-predict-deposit';
export const ACTIVITY_CV_PREDICT_DEPOSIT_HASH = '0xactivitycvpredictdeposit';
export const ACTIVITY_CV_PREDICT_DEPOSIT_TIME_MS = 1_716_367_790_000;

/**
 * MetaMask Pay fee metadata for Predict deposit Activity Details CV
 * (network fee in ETH, bridge fee in USDC, total in USD).
 */
export const ACTIVITY_CV_PREDICT_DEPOSIT_PAY = {
  chainId: '0x1' as const,
  tokenAddress: ACTIVITY_CV_USDC,
  networkFeeFiat: '1.23',
  bridgeFeeFiat: '0.09',
  totalFiat: '4001.32',
};

/**
 * Confirmed Predict deposit batch → `predictionsAddFunds` under Predictions filter.
 */
export const buildConfirmedLocalPredictDepositTransaction =
  (): TransactionMeta =>
    ({
      id: ACTIVITY_CV_PREDICT_DEPOSIT_ID,
      hash: ACTIVITY_CV_PREDICT_DEPOSIT_HASH,
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: ACTIVITY_CV_PREDICT_DEPOSIT_TIME_MS,
      type: TransactionType.batch,
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_ACCOUNT,
        value: '0x0',
        nonce: '0x9',
      },
      nestedTransactions: [
        {
          type: TransactionType.predictDeposit,
          to: ACTIVITY_CV_USDC,
          data: buildErc20TransferCalldata(
            ACTIVITY_CV_RECIPIENT,
            ACTIVITY_CV_PREDICT_USDC_AMOUNT,
          ),
        },
      ],
      txReceipt: { status: '0x1' },
    }) as unknown as TransactionMeta;

/**
 * Confirmed Predict deposit with MetaMask Pay fees for Activity Details CV.
 */
export const buildConfirmedLocalPredictDepositWithPayTransaction =
  (): TransactionMeta =>
    ({
      ...buildConfirmedLocalPredictDepositTransaction(),
      metamaskPay: ACTIVITY_CV_PREDICT_DEPOSIT_PAY,
    }) as unknown as TransactionMeta;

/**
 * Pending Predict deposit with MetaMask Pay fees for Activity Details CV.
 */
export const buildPendingLocalPredictDepositWithPayTransaction =
  (): TransactionMeta =>
    ({
      ...buildConfirmedLocalPredictDepositTransaction(),
      id: 'activity-cv-predict-deposit-pending',
      hash: '0xactivitycvpredictdepositpending',
      status: TransactionStatus.submitted,
      metamaskPay: ACTIVITY_CV_PREDICT_DEPOSIT_PAY,
    }) as unknown as TransactionMeta;

/**
 * Failed Predict deposit with MetaMask Pay fees for Activity Details CV.
 */
export const buildFailedLocalPredictDepositWithPayTransaction =
  (): TransactionMeta =>
    ({
      ...buildConfirmedLocalPredictDepositTransaction(),
      id: 'activity-cv-predict-deposit-failed',
      hash: '0xactivitycvpredictdepositfailed',
      status: TransactionStatus.failed,
      metamaskPay: ACTIVITY_CV_PREDICT_DEPOSIT_PAY,
      txReceipt: { status: '0x0' },
    }) as unknown as TransactionMeta;

/** Seeds TokensController so Pay bridge-fee rows resolve the USDC symbol. */
export const activityPredictPayUsdcTokenOverride = {
  engine: {
    backgroundState: {
      TokensController: {
        allTokens: {
          '0x1': {
            [ACTIVITY_CV_ACCOUNT]: [
              {
                address: ACTIVITY_CV_USDC,
                symbol: 'USDC',
                decimals: 6,
              },
            ],
          },
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

/** Native USDC on Arbitrum — Perps withdraw Activity Details CV. */
export const ACTIVITY_CV_USDC_ARBITRUM =
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

export const ACTIVITY_CV_PERPS_WITHDRAW_ID = 'activity-cv-perps-withdraw';
export const ACTIVITY_CV_PERPS_WITHDRAW_HASH = '0xactivitycvperpswithdraw';
export const ACTIVITY_CV_PERPS_WITHDRAW_TIME_MS = 1_716_367_795_000;

/**
 * Confirmed Perps withdraw → `perpsWithdraw` for Activity Details CV.
 */
export const buildConfirmedLocalPerpsWithdrawTransaction =
  (): TransactionMeta =>
    ({
      id: ACTIVITY_CV_PERPS_WITHDRAW_ID,
      hash: ACTIVITY_CV_PERPS_WITHDRAW_HASH,
      chainId: '0xa4b1',
      status: TransactionStatus.confirmed,
      time: ACTIVITY_CV_PERPS_WITHDRAW_TIME_MS,
      type: TransactionType.perpsWithdraw,
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_USDC_ARBITRUM,
        value: '0x0',
        nonce: '0xb',
        data: buildErc20TransferCalldata(
          ACTIVITY_CV_ACCOUNT,
          ACTIVITY_CV_PREDICT_USDC_AMOUNT,
        ),
      },
      txReceipt: { status: '0x1' },
    }) as unknown as TransactionMeta;

/** Enables Arbitrum so local Perps withdraw rows resolve in Activity Details CV. */
export const activityArbitrumNetworkEnablementOverride = {
  engine: {
    backgroundState: {
      NetworkEnablementController: {
        enabledNetworkMap: {
          eip155: {
            '0x1': true,
            '0xa4b1': true,
          },
          solana: {},
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

/**
 * Confirmed Predict withdraw batch → `predictionsWithdrawFunds` under Predictions filter.
 */
export const buildConfirmedLocalPredictWithdrawTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-predict-withdraw',
      hash: '0xactivitycvpredictwithdraw',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_791_000,
      type: TransactionType.batch,
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_ACCOUNT,
        value: '0x0',
        nonce: '0xa',
      },
      nestedTransactions: [
        {
          type: TransactionType.predictWithdraw,
          to: ACTIVITY_CV_USDC,
          data: buildErc20TransferCalldata(
            ACTIVITY_CV_ACCOUNT,
            ACTIVITY_CV_PREDICT_USDC_AMOUNT,
          ),
        },
      ],
      txReceipt: { status: '0x1' },
    }) as unknown as TransactionMeta;

/** Provider feed buy → `predictionPlaced` (negative primary, market subtitle). */
export const buildPredictBuyActivity = (): PredictActivity => ({
  id: 'activity-cv-predict-buy',
  providerId: 'polymarket',
  title: ACTIVITY_CV_PREDICT_MARKET_TITLE,
  icon: ACTIVITY_CV_PREDICT_MARKET_ICON,
  outcome: 'Yes',
  eventSlug: 'spain-world-cup-2026',
  entry: {
    type: 'buy',
    timestamp: 1_716_367_792,
    marketId: 'm-cv-1',
    outcomeId: 'o-cv-1',
    outcomeTokenId: 1,
    amount: 55,
    price: 10,
  },
});

/** Provider feed sell → `predictionCashedOut` (positive primary, market subtitle). */
export const buildPredictSellActivity = (): PredictActivity => ({
  id: 'activity-cv-predict-sell',
  providerId: 'polymarket',
  title: ACTIVITY_CV_PREDICT_MARKET_TITLE,
  icon: ACTIVITY_CV_PREDICT_MARKET_ICON,
  outcome: 'Yes',
  eventSlug: 'spain-world-cup-2026',
  entry: {
    type: 'sell',
    timestamp: 1_716_367_793,
    marketId: 'm-cv-1',
    outcomeId: 'o-cv-1',
    outcomeTokenId: 1,
    amount: 10,
    price: 0.7,
  },
});

/** Provider feed claim → `predictionClaimWinnings` (positive primary, market subtitle). */
export const buildPredictClaimActivity = (): PredictActivity => ({
  id: 'activity-cv-predict-claim',
  providerId: 'polymarket',
  title: ACTIVITY_CV_PREDICT_MARKET_TITLE,
  icon: ACTIVITY_CV_PREDICT_MARKET_ICON,
  totalNetPnlUsd: 12.5,
  netPnlUsd: 4.25,
  entry: {
    type: 'claimWinnings',
    timestamp: 1_716_367_794,
    amount: 5.49,
  },
});

/** Remote flag shape that enables PredictActivitySource on ActivityScreen CV. */
export const activityPredictTradingEnabledFlag = {
  predictTradingEnabled: {
    enabled: true,
    minimumVersion: '0.0.0',
  },
} as const;

const enabledMainnetNetworkMap = {
  eip155: {
    '0x1': true,
  },
  solana: {},
} as const;

/**
 * Minimal Activity state. EVM networks are intentionally disabled by default so
 * ActivityList renders through Redux without kicking off the external tx API.
 */
export const initialStateActivity = () =>
  createStateFixture()
    .withMinimalAccounts(ACTIVITY_CV_ACCOUNT)
    .withMinimalMainnetNetwork()
    .withMinimalMultichainNetwork(true)
    .withMinimalTransactionController()
    .withMinimalKeyringController()
    .withMinimalBridgeController()
    .withMinimalTokenRates()
    .withMinimalMultichainTransactions()
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags({})
    .withOverrides({
      settings: {
        showFiatOnTestnets: true,
      },
      engine: {
        backgroundState: {
          AccountTrackerController: {
            accounts: {},
            accountsByChainId: {},
          },
          CurrencyRateController: {
            currentCurrency: 'USD',
            currencyRates: {
              ETH: {
                conversionRate: 2500,
                usdConversionRate: 2500,
              },
            },
          },
          GasFeeController: {
            gasFeeEstimates: {},
          },
          MoneyAccountController: {
            moneyAccounts: {},
          },
          NetworkEnablementController: {
            enabledNetworkMap: {
              eip155: {},
              solana: {},
            },
          },
          PreferencesController: {
            showTestNetworks: false,
            tokenNetworkFilter: {},
            tokenSortConfig: {
              key: 'tokenFiatAmount',
              order: 'dsc',
              sortCallback: 'stringNumeric',
            },
          },
          SmartTransactionsController: {
            smartTransactionsState: {
              smartTransactions: {},
            },
          },
          TokenBalancesController: {
            tokenBalances: {},
          },
          NftController: {
            allNfts: {},
            allNftContracts: {},
          },
          TokensController: {
            allTokens: {
              '0x1': {
                [ACTIVITY_CV_ACCOUNT]: [],
              },
            },
            allDetectedTokens: {},
            allIgnoredTokens: {},
          },
        },
      },
    } as unknown as DeepPartial<RootState>);

export const activityLineaNetworkOverride = {
  engine: {
    backgroundState: {
      NetworkController: {
        networkConfigurationsByChainId: {
          '0xe708': {
            chainId: '0xe708',
            rpcEndpoints: [
              {
                networkClientId: 'linea-mainnet',
                url: 'https://linea-mainnet.infura.io/v3/{infuraProjectId}',
                type: 'infura',
                name: 'Linea default RPC',
              },
            ],
            defaultRpcEndpointIndex: 0,
            blockExplorerUrls: ['https://lineascan.build'],
            defaultBlockExplorerUrlIndex: 0,
            name: 'Linea',
            nativeCurrency: 'ETH',
          },
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

export const initialStateActivityWithLocalTransactions = (
  transactions: TransactionMeta[],
) =>
  initialStateActivity().withOverrides({
    engine: {
      backgroundState: {
        NetworkEnablementController: {
          enabledNetworkMap: enabledMainnetNetworkMap,
        },
        TransactionController: {
          transactions,
          swapsTransactions: {},
        },
      },
    },
  } as unknown as DeepPartial<RootState>);

export const initialStateActivityWithRedesignEnabled = () =>
  initialStateActivity().withRemoteFeatureFlags({
    tmcuActivityRedesignEnabled: true,
  });

/** State for ActivityList tests that load EVM history from the accounts API. */
export const initialStateActivityWithAccountsApi = () =>
  initialStateActivity().withOverrides({
    engine: {
      backgroundState: {
        NetworkEnablementController: {
          enabledNetworkMap: enabledMainnetNetworkMap,
        },
        PreferencesController: {
          privacyMode: false,
        },
      },
    },
  } as unknown as DeepPartial<RootState>);

export const ACTIVITY_CV_RAMP_BUY_ORDER_ID = 'activitycvrampbuymusd';
export const ACTIVITY_CV_RAMP_SELL_ORDER_ID = 'activitycvrampselleth';
export const ACTIVITY_CV_RAMP_BUY_TX_HASH = '0xactivitycvrampbuymusdhash';
export const ACTIVITY_CV_RAMP_SELL_TX_HASH = '0xactivitycvrampsellethhash';
export const ACTIVITY_CV_RAMP_CREATED_AT = 1_716_367_790_000;

/** Completed FiatOrder buy of 5.01 mUSD for Activity Details CV. */
export const buildActivityCvRampBuyMusdOrder = (): FiatOrder =>
  ({
    id: ACTIVITY_CV_RAMP_BUY_ORDER_ID,
    provider: FIAT_ORDER_PROVIDERS.TRANSAK,
    createdAt: ACTIVITY_CV_RAMP_CREATED_AT,
    amount: '6.27',
    fee: '1.26',
    cryptoAmount: '5.01',
    currency: 'USD',
    cryptocurrency: 'mUSD',
    state: FIAT_ORDER_STATES.COMPLETED,
    account: ACTIVITY_CV_ACCOUNT,
    network: '1',
    txHash: ACTIVITY_CV_RAMP_BUY_TX_HASH,
    excludeFromPurchases: false,
    orderType: OrderOrderTypeEnum.Buy,
    data: {},
  }) as FiatOrder;

/** Completed FiatOrder sell of 0.085 ETH for Activity Details CV. */
export const buildActivityCvRampSellEthOrder = (): FiatOrder =>
  ({
    id: ACTIVITY_CV_RAMP_SELL_ORDER_ID,
    provider: FIAT_ORDER_PROVIDERS.TRANSAK,
    createdAt: ACTIVITY_CV_RAMP_CREATED_AT,
    amount: '61.88',
    fee: '3',
    cryptoAmount: '0.085',
    currency: 'EUR',
    cryptocurrency: 'ETH',
    state: FIAT_ORDER_STATES.COMPLETED,
    account: ACTIVITY_CV_ACCOUNT,
    network: '1',
    txHash: undefined,
    sellTxHash: ACTIVITY_CV_RAMP_SELL_TX_HASH,
    excludeFromPurchases: false,
    orderType: OrderOrderTypeEnum.Sell,
    data: {},
  }) as FiatOrder;

/** Activity state with redesign + legacy fiatOrders for Ramp Details CV. */
export const initialStateActivityWithRampOrders = (orders: FiatOrder[]) =>
  initialStateActivity()
    .withRemoteFeatureFlags({ tmcuActivityRedesignEnabled: true })
    .withOverrides({
      fiatOrders: {
        orders,
      },
      engine: {
        backgroundState: {
          NetworkEnablementController: {
            enabledNetworkMap: enabledMainnetNetworkMap,
          },
          RampsController: {
            orders: [],
          },
        },
      },
    } as unknown as DeepPartial<RootState>);

export const ACTIVITY_CV_SOLANA_ACCOUNT_ID = 'activity-cv-solana-acc';

export const ACTIVITY_CV_SOLANA_ADDRESS = '11111111111111111111111111111111';

export const ACTIVITY_CV_SOLANA_SEND_ID = 'activity-cv-solana-send';

export const ACTIVITY_CV_SOLANA_SWAP_ID = 'activity-cv-solana-swap';

export const ACTIVITY_CV_SOLANA_ASSET_ID =
  `${ACTIVITY_CV_SOLANA_CHAIN_ID}/slip44:501` as const;

export const ACTIVITY_CV_SOLANA_USDC_ASSET_ID =
  `${ACTIVITY_CV_SOLANA_CHAIN_ID}/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` as const;

/**
 * Confirmed Solana native send (2 SOL). Keyring amounts are human-readable.
 * Pair with {@link activityCvSolanaSendStateOverrides} for details fiat CV.
 */
export const activityCvSolanaSendTransaction = {
  id: ACTIVITY_CV_SOLANA_SEND_ID,
  chain: ACTIVITY_CV_SOLANA_CHAIN_ID,
  account: ACTIVITY_CV_SOLANA_ACCOUNT_ID,
  status: 'confirmed',
  timestamp: 1_716_367_795,
  type: 'send',
  from: [
    {
      address: ACTIVITY_CV_SOLANA_ADDRESS,
      asset: {
        fungible: true,
        type: ACTIVITY_CV_SOLANA_ASSET_ID,
        unit: 'SOL',
        amount: '2',
      },
    },
  ],
  to: [
    {
      address: 'So11111111111111111111111111111111111111112',
      asset: null,
    },
  ],
  fees: [],
  events: [],
};

/**
 * Confirmed Solana SOL → USDC swap (1 SOL → 100 USDC) with a SOL network fee.
 * Pair with {@link activityCvSolanaSwapStateOverrides} for Activity Details CV.
 */
export const activityCvSolanaSwapTransaction = {
  id: ACTIVITY_CV_SOLANA_SWAP_ID,
  chain: ACTIVITY_CV_SOLANA_CHAIN_ID,
  account: ACTIVITY_CV_SOLANA_ACCOUNT_ID,
  status: 'confirmed',
  timestamp: 1_716_367_796,
  type: 'swap',
  from: [
    {
      address: ACTIVITY_CV_SOLANA_ADDRESS,
      asset: {
        fungible: true,
        type: ACTIVITY_CV_SOLANA_ASSET_ID,
        unit: 'SOL',
        amount: '1',
      },
    },
  ],
  to: [
    {
      address: ACTIVITY_CV_SOLANA_ADDRESS,
      asset: {
        fungible: true,
        type: ACTIVITY_CV_SOLANA_USDC_ASSET_ID,
        unit: 'USDC',
        amount: '100',
      },
    },
  ],
  fees: [
    {
      type: 'base',
      asset: {
        fungible: true,
        type: ACTIVITY_CV_SOLANA_ASSET_ID,
        unit: 'SOL',
        amount: '0.01',
      },
    },
  ],
  events: [],
};

/**
 * Redux overrides: Solana account in the selected group, non-EVM send history,
 * and multichain rate 4 → 2 SOL totals $8 on ActivityDetails.
 */
export const activityCvSolanaSendStateOverrides = {
  engine: {
    backgroundState: {
      AccountsController: {
        internalAccounts: {
          accounts: {
            [ACTIVITY_CV_SOLANA_ACCOUNT_ID]: {
              id: ACTIVITY_CV_SOLANA_ACCOUNT_ID,
              address: ACTIVITY_CV_SOLANA_ADDRESS,
              type: 'solana:data-account',
              options: {},
              methods: [],
              metadata: {
                name: 'Solana Account 1',
                importTime: 1,
                keyring: { type: 'Snap Keyring' },
              },
              scopes: [ACTIVITY_CV_SOLANA_CHAIN_ID],
            },
          },
        },
      },
      AccountTreeController: {
        accountTree: {
          wallets: {
            'entropy:wallet1': {
              id: 'entropy:wallet1',
              type: 'Entropy',
              metadata: { name: 'Wallet 1', entropy: { id: 'wallet1' } },
              groups: {
                'entropy:wallet1/0': {
                  id: 'entropy:wallet1/0',
                  type: 'MultipleAccount',
                  metadata: {
                    name: 'Group 1',
                    pinned: false,
                    hidden: false,
                    lastSelected: 0,
                  },
                  accounts: ['acc-1', ACTIVITY_CV_SOLANA_ACCOUNT_ID],
                },
              },
            },
          },
        },
        selectedAccountGroup: 'entropy:wallet1/0',
      },
      MultichainTransactionsController: {
        nonEvmTransactions: {
          [ACTIVITY_CV_SOLANA_ACCOUNT_ID]: {
            [ACTIVITY_CV_SOLANA_CHAIN_ID]: {
              transactions: [activityCvSolanaSendTransaction],
              next: null,
              lastUpdated: 1_716_367_795_000,
            },
          },
        },
      },
      MultichainAssetsRatesController: {
        conversionRates: {
          [ACTIVITY_CV_SOLANA_ASSET_ID]: {
            rate: '4',
            currency: 'usd',
          },
        },
      },
      MultichainNetworkController: {
        isEvmSelected: false,
        selectedMultichainNetworkChainId: ACTIVITY_CV_SOLANA_CHAIN_ID,
      },
    },
  },
} as unknown as DeepPartial<RootState>;

/** HyperLiquid settlement chain used by Perps Activity Details CV. */
export const ACTIVITY_CV_PERPS_CHAIN_ID = 'eip155:42161' as CaipChainId;

export const ACTIVITY_CV_PERPS_DEPOSIT_HASH = '0xactivitycvperpsdeposit';

export const ACTIVITY_CV_PERPS_DEPOSIT_TIMESTAMP_MS = 1_765_361_640_000;

const ACTIVITY_CV_PERPS_COLLATERAL_ASSET_ID =
  `${ACTIVITY_CV_PERPS_CHAIN_ID}/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831` as const;

const activityCvPerpsPayMetadata = {
  chainId: '0x1' as const,
  tokenAddress: ACTIVITY_CV_USDC,
  networkFeeFiat: '1.23',
  bridgeFeeFiat: '0.09',
  totalFiat: '1001.24',
};

/**
 * Local Pay transaction matched to a feed-backed Perps deposit by hash.
 * `chainId` is Arbitrum so it matches the activity row; `metamaskPay.chainId`
 * is Ethereum so the network fee is denominated in ETH.
 */
export const buildActivityCvPerpsPayTransaction = (
  hash = ACTIVITY_CV_PERPS_DEPOSIT_HASH,
): TransactionMeta =>
  ({
    id: 'activity-cv-perps-pay-tx',
    hash,
    chainId: '0xa4b1',
    status: TransactionStatus.confirmed,
    time: ACTIVITY_CV_PERPS_DEPOSIT_TIMESTAMP_MS,
    type: TransactionType.perpsDeposit,
    txParams: {
      from: ACTIVITY_CV_ACCOUNT,
      to: ACTIVITY_CV_USDC,
      value: '0x0',
    },
    metamaskPay: activityCvPerpsPayMetadata,
  }) as unknown as TransactionMeta;

export const buildActivityCvPerpsDepositTransaction = (
  status: 'completed' | 'pending' | 'failed' | 'bridging',
  hash = ACTIVITY_CV_PERPS_DEPOSIT_HASH,
): PerpsTransaction => ({
  id: `wallet-activity-cv-perps-deposit-${status}`,
  type: 'deposit',
  category: 'deposit',
  title: 'Account funded',
  subtitle: '+$1,000',
  timestamp: ACTIVITY_CV_PERPS_DEPOSIT_TIMESTAMP_MS,
  asset: 'USDC',
  depositWithdrawal: {
    amount: '+$1,000',
    amountNumber: 1000,
    isPositive: true,
    asset: 'USDC',
    txHash: hash,
    status,
    type: 'deposit',
  },
});

export const buildActivityCvPerpsCompletedDepositTransaction =
  (): PerpsTransaction => buildActivityCvPerpsDepositTransaction('completed');

export const buildActivityCvPerpsPendingDepositTransaction =
  (): PerpsTransaction =>
    buildActivityCvPerpsDepositTransaction(
      'pending',
      `${ACTIVITY_CV_PERPS_DEPOSIT_HASH}pending`,
    );

export const buildActivityCvPerpsFailedDepositTransaction =
  (): PerpsTransaction => {
    const transaction = buildActivityCvPerpsDepositTransaction(
      'failed',
      `${ACTIVITY_CV_PERPS_DEPOSIT_HASH}failed`,
    );
    const depositWithdrawal = transaction.depositWithdrawal;

    if (!depositWithdrawal) {
      throw new Error('Expected a Perps depositWithdrawal payload');
    }

    // Failed deposits do not credit the account; FundsDetails colors the hero
    // from `isPositive`, which is TextDefault when false.
    return {
      ...transaction,
      depositWithdrawal: {
        ...depositWithdrawal,
        isPositive: false,
      },
    };
  };

export const buildActivityCvPerpsFundsItem = (
  transaction: PerpsTransaction,
): ActivityListItem => {
  const item = mapPerpsTransaction({
    transaction,
    chainId: ACTIVITY_CV_PERPS_CHAIN_ID,
    collateralAssetId: ACTIVITY_CV_PERPS_COLLATERAL_ASSET_ID,
  });

  if (!item) {
    throw new Error('Expected a mapped Perps funds activity item');
  }

  return item;
};

export const buildActivityCvPerpsCompletedDepositItem = (): ActivityListItem =>
  buildActivityCvPerpsFundsItem(
    buildActivityCvPerpsCompletedDepositTransaction(),
  );

export const buildActivityCvPerpsPendingDepositItem = (): ActivityListItem =>
  buildActivityCvPerpsFundsItem(
    buildActivityCvPerpsPendingDepositTransaction(),
  );

export const buildActivityCvPerpsFailedDepositItem = (): ActivityListItem =>
  buildActivityCvPerpsFundsItem(buildActivityCvPerpsFailedDepositTransaction());

export const ACTIVITY_CV_PERPS_WITHDRAWAL_HASH = '0xactivitycvperpswithdraw';

export const buildActivityCvPerpsCompletedWithdrawalTransaction =
  (): PerpsTransaction => ({
    id: 'wallet-activity-cv-perps-withdrawal-completed',
    type: 'withdrawal',
    category: 'withdrawal',
    title: 'Withdrawal',
    subtitle: '-$1,000',
    timestamp: ACTIVITY_CV_PERPS_DEPOSIT_TIMESTAMP_MS,
    asset: 'USDC',
    depositWithdrawal: {
      amount: '-$1,000',
      amountNumber: 1000,
      isPositive: false,
      asset: 'USDC',
      txHash: ACTIVITY_CV_PERPS_WITHDRAWAL_HASH,
      status: 'completed',
      type: 'withdrawal',
    },
  });

export const buildActivityCvPerpsCompletedWithdrawalItem =
  (): ActivityListItem =>
    buildActivityCvPerpsFundsItem(
      buildActivityCvPerpsCompletedWithdrawalTransaction(),
    );

const ACTIVITY_CV_PERPS_TRADE_SIZE = '0.0001';
const ACTIVITY_CV_PERPS_TRADE_PRICE = '92113';
const ACTIVITY_CV_PERPS_TRADE_FEE = '0.50';
const ACTIVITY_CV_PERPS_TRADE_ASSET = 'BTC';
const ACTIVITY_CV_PERPS_TRADE_SUBTITLE = `${ACTIVITY_CV_PERPS_TRADE_SIZE} ${ACTIVITY_CV_PERPS_TRADE_ASSET}`;

type ActivityCvPerpsTradeKind =
  | 'openShort'
  | 'openLong'
  | 'closeShort'
  | 'closeLong';

const ACTIVITY_CV_PERPS_TRADE_SPECS: Record<
  ActivityCvPerpsTradeKind,
  {
    id: string;
    shortTitle: string;
    action: 'Opened' | 'Closed';
    category: 'position_open' | 'position_close';
    amount: string;
    amountNumber: number;
    isPositive: boolean;
    pnl: string;
  }
> = {
  openShort: {
    id: 'activity-cv-perps-open-short',
    shortTitle: 'Opened short',
    action: 'Opened',
    category: 'position_open',
    amount: '-$0.50',
    amountNumber: -0.5,
    isPositive: false,
    pnl: '0',
  },
  openLong: {
    id: 'activity-cv-perps-open-long',
    shortTitle: 'Opened long',
    action: 'Opened',
    category: 'position_open',
    amount: '-$0.50',
    amountNumber: -0.5,
    isPositive: false,
    pnl: '0',
  },
  closeShort: {
    id: 'activity-cv-perps-close-short',
    shortTitle: 'Closed short',
    action: 'Closed',
    category: 'position_close',
    amount: '-$12.34',
    amountNumber: -12.34,
    isPositive: false,
    pnl: '-$12.34',
  },
  closeLong: {
    id: 'activity-cv-perps-close-long',
    shortTitle: 'Closed long',
    action: 'Closed',
    category: 'position_close',
    amount: '+$45.67',
    amountNumber: 45.67,
    isPositive: true,
    pnl: '+$45.67',
  },
};

export const buildActivityCvPerpsTradeTransaction = (
  kind: ActivityCvPerpsTradeKind,
): PerpsTransaction => {
  const spec = ACTIVITY_CV_PERPS_TRADE_SPECS[kind];

  return {
    id: spec.id,
    type: 'trade',
    category: spec.category,
    title: spec.shortTitle,
    subtitle: ACTIVITY_CV_PERPS_TRADE_SUBTITLE,
    timestamp: ACTIVITY_CV_PERPS_DEPOSIT_TIMESTAMP_MS,
    asset: ACTIVITY_CV_PERPS_TRADE_ASSET,
    fill: {
      shortTitle: spec.shortTitle,
      amount: spec.amount,
      amountNumber: spec.amountNumber,
      isPositive: spec.isPositive,
      size: ACTIVITY_CV_PERPS_TRADE_SIZE,
      entryPrice: ACTIVITY_CV_PERPS_TRADE_PRICE,
      points: '0',
      pnl: spec.pnl,
      fee: ACTIVITY_CV_PERPS_TRADE_FEE,
      action: spec.action,
      feeToken: 'USDC',
      fillType: FillType.Standard,
    },
  };
};

export const buildActivityCvPerpsTradeItem = (
  kind: ActivityCvPerpsTradeKind,
): ActivityListItem => {
  const item = mapPerpsTransaction({
    transaction: buildActivityCvPerpsTradeTransaction(kind),
    chainId: ACTIVITY_CV_PERPS_CHAIN_ID,
  });

  if (!item) {
    throw new Error(`Expected a mapped Perps ${kind} activity item`);
  }

  return item;
};

export const ACTIVITY_CV_PERPS_ORDER_FEE = '2.345';

type ActivityCvPerpsOrderKind =
  | 'marketCloseShort'
  | 'stopMarketCloseShort'
  | 'takeProfitCanceled'
  | 'takeProfitFilled';

const ACTIVITY_CV_PERPS_ORDER_SPECS: Record<
  ActivityCvPerpsOrderKind,
  {
    id: string;
    title: string;
    orderType: 'market' | 'limit';
    filled: string;
    statusText: PerpsOrderTransactionStatus;
    statusType: PerpsOrderTransactionStatusType;
    reduceOnly?: boolean;
    isTrigger?: boolean;
    detailedOrderType?: string;
  }
> = {
  marketCloseShort: {
    id: 'activity-cv-perps-order-market-close-short',
    title: 'Market close short',
    orderType: 'market',
    filled: '100%',
    statusText: PerpsOrderTransactionStatus.Filled,
    statusType: PerpsOrderTransactionStatusType.Filled,
    reduceOnly: true,
  },
  stopMarketCloseShort: {
    id: 'activity-cv-perps-order-stop-market-close-short',
    title: 'Stop market close short',
    orderType: 'market',
    filled: '100%',
    statusText: PerpsOrderTransactionStatus.Filled,
    statusType: PerpsOrderTransactionStatusType.Filled,
    isTrigger: true,
    detailedOrderType: 'Stop Market',
  },
  takeProfitCanceled: {
    id: 'activity-cv-perps-order-tp-canceled',
    title: 'Take profit limit close short',
    orderType: 'limit',
    filled: '0%',
    statusText: PerpsOrderTransactionStatus.Canceled,
    statusType: PerpsOrderTransactionStatusType.Canceled,
    isTrigger: true,
    detailedOrderType: 'Take Profit Limit',
  },
  takeProfitFilled: {
    id: 'activity-cv-perps-order-tp-filled',
    title: 'Take profit limit close short',
    orderType: 'limit',
    filled: '100%',
    statusText: PerpsOrderTransactionStatus.Filled,
    statusType: PerpsOrderTransactionStatusType.Filled,
    isTrigger: true,
    detailedOrderType: 'Take Profit Limit',
  },
};

export const buildActivityCvPerpsOrderTransaction = (
  kind: ActivityCvPerpsOrderKind,
): PerpsTransaction => {
  const spec = ACTIVITY_CV_PERPS_ORDER_SPECS[kind];

  return {
    id: spec.id,
    type: 'order',
    category: 'limit_order',
    title: spec.title,
    subtitle: ACTIVITY_CV_PERPS_TRADE_SUBTITLE,
    timestamp: ACTIVITY_CV_PERPS_DEPOSIT_TIMESTAMP_MS,
    asset: ACTIVITY_CV_PERPS_TRADE_ASSET,
    order: {
      orderId: spec.id,
      text: spec.statusText,
      statusType: spec.statusType,
      type: spec.orderType,
      size: '9.2113',
      limitPrice: ACTIVITY_CV_PERPS_TRADE_PRICE,
      filled: spec.filled,
      side: 'buy',
      reduceOnly: spec.reduceOnly,
      isTrigger: spec.isTrigger,
      detailedOrderType: spec.detailedOrderType,
    },
  };
};

export const buildActivityCvPerpsOrderItem = (
  kind: ActivityCvPerpsOrderKind,
): ActivityListItem => {
  const item = mapPerpsTransaction({
    transaction: buildActivityCvPerpsOrderTransaction(kind),
    chainId: ACTIVITY_CV_PERPS_CHAIN_ID,
  });

  if (!item) {
    throw new Error(`Expected a mapped Perps ${kind} order activity item`);
  }

  return item;
};

export const buildActivityCvPerpsOrderFill = (orderId: string) => ({
  orderId,
  symbol: ACTIVITY_CV_PERPS_TRADE_ASSET,
  side: 'buy' as const,
  size: ACTIVITY_CV_PERPS_TRADE_SIZE,
  price: ACTIVITY_CV_PERPS_TRADE_PRICE,
  pnl: '0',
  direction: 'Close Short',
  fee: ACTIVITY_CV_PERPS_ORDER_FEE,
  feeToken: 'USDC',
  timestamp: ACTIVITY_CV_PERPS_DEPOSIT_TIMESTAMP_MS,
  startPosition: ACTIVITY_CV_PERPS_TRADE_SIZE,
  success: true,
});

type ActivityCvPerpsFundingKind = 'received' | 'paid';

const ACTIVITY_CV_PERPS_FUNDING_SPECS: Record<
  ActivityCvPerpsFundingKind,
  {
    id: string;
    title: string;
    isPositive: boolean;
    fee: string;
    feeNumber: number;
    rate: string;
  }
> = {
  received: {
    id: 'activity-cv-perps-funding-received',
    title: 'Received funding fee',
    isPositive: true,
    fee: '+$1.23',
    feeNumber: 1.23,
    rate: '-0.0125%',
  },
  paid: {
    id: 'activity-cv-perps-funding-paid',
    title: 'Paid funding fee',
    isPositive: false,
    fee: '-$0.50',
    feeNumber: -0.5,
    rate: '0.01%',
  },
};

export const buildActivityCvPerpsFundingTransaction = (
  kind: ActivityCvPerpsFundingKind,
): PerpsTransaction => {
  const spec = ACTIVITY_CV_PERPS_FUNDING_SPECS[kind];

  return {
    id: spec.id,
    type: 'funding',
    category: 'funding_fee',
    title: spec.title,
    subtitle: ACTIVITY_CV_PERPS_TRADE_ASSET,
    timestamp: ACTIVITY_CV_PERPS_DEPOSIT_TIMESTAMP_MS,
    asset: ACTIVITY_CV_PERPS_TRADE_ASSET,
    fundingAmount: {
      isPositive: spec.isPositive,
      fee: spec.fee,
      feeNumber: spec.feeNumber,
      rate: spec.rate,
    },
  };
};

export const buildActivityCvPerpsFundingItem = (
  kind: ActivityCvPerpsFundingKind,
): ActivityListItem => {
  const item = mapPerpsTransaction({
    transaction: buildActivityCvPerpsFundingTransaction(kind),
    chainId: ACTIVITY_CV_PERPS_CHAIN_ID,
  });

  if (!item) {
    throw new Error(`Expected a mapped Perps ${kind} funding activity item`);
  }

  return item;
};

/** Arbitrum + PerpsController + mainnet USDC so Pay fee avatars resolve. */
export const activityPerpsDetailsStateOverrides = {
  engine: {
    backgroundState: {
      PerpsController: {
        isEligible: true,
        initializationState: 'initialized',
        mode: 'lite',
        activeProvider: 'hyperliquid',
        isTestnet: false,
      },
      NetworkController: {
        networkConfigurationsByChainId: {
          '0xa4b1': {
            chainId: '0xa4b1',
            name: 'Arbitrum One',
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: 'arbitrum-mainnet',
                type: 'infura',
                url: 'https://arbitrum-mainnet.infura.io/v3/{infuraProjectId}',
              },
            ],
            defaultRpcEndpointIndex: 0,
            blockExplorerUrls: ['https://arbiscan.io'],
            defaultBlockExplorerUrlIndex: 0,
          },
        },
      },
      TokensController: {
        allTokens: {
          '0x1': {
            [ACTIVITY_CV_ACCOUNT]: [
              {
                address: ACTIVITY_CV_USDC,
                symbol: 'USDC',
                decimals: 6,
              },
            ],
          },
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

/**
 * Same Solana account wiring as {@link activityCvSolanaSendStateOverrides}, with
 * the SOL→USDC swap history and USDC rate for fee/total fiat on Activity Details.
 */
export const activityCvSolanaSwapStateOverrides = {
  engine: {
    backgroundState: {
      ...(activityCvSolanaSendStateOverrides.engine?.backgroundState ?? {}),
      MultichainTransactionsController: {
        nonEvmTransactions: {
          [ACTIVITY_CV_SOLANA_ACCOUNT_ID]: {
            [ACTIVITY_CV_SOLANA_CHAIN_ID]: {
              transactions: [activityCvSolanaSwapTransaction],
              next: null,
              lastUpdated: 1_716_367_796_000,
            },
          },
        },
      },
      MultichainAssetsRatesController: {
        conversionRates: {
          [ACTIVITY_CV_SOLANA_ASSET_ID]: {
            rate: '4',
            currency: 'usd',
          },
          [ACTIVITY_CV_SOLANA_USDC_ASSET_ID]: {
            rate: '1',
            currency: 'usd',
          },
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

export const initialStateActivityWithPerpsDetails = (
  transactions: TransactionMeta[] = [],
) =>
  initialStateActivity()
    .withRemoteFeatureFlags({ tmcuActivityRedesignEnabled: true })
    .withOverrides(activityPerpsDetailsStateOverrides)
    .withOverrides({
      engine: {
        backgroundState: {
          TransactionController: {
            transactions,
            swapsTransactions: {},
          },
        },
      },
    } as unknown as DeepPartial<RootState>);
