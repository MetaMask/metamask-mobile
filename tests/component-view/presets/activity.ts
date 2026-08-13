import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../app/constants/on-ramp';
import type { FiatOrder } from '../../../app/reducers/fiatOrders/types';
import { MERKL_DISTRIBUTOR_ADDRESS } from '../../../app/components/UI/Earn/components/MerklRewards/constants';
import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import type { PredictActivity } from '../../../app/components/UI/Predict/types';

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

/**
 * Confirmed Predict deposit batch → `predictionsAddFunds` under Predictions filter.
 */
export const buildConfirmedLocalPredictDepositTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-predict-deposit',
      hash: '0xactivitycvpredictdeposit',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_790_000,
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
  entry: {
    type: 'buy',
    timestamp: 1_716_367_792,
    marketId: 'm-cv-1',
    outcomeId: 'o-cv-1',
    outcomeTokenId: 1,
    amount: 3,
    price: 0.42,
  },
});

/** Provider feed sell → `predictionCashedOut` (positive primary, market subtitle). */
export const buildPredictSellActivity = (): PredictActivity => ({
  id: 'activity-cv-predict-sell',
  providerId: 'polymarket',
  title: ACTIVITY_CV_PREDICT_MARKET_TITLE,
  icon: ACTIVITY_CV_PREDICT_MARKET_ICON,
  outcome: 'Yes',
  entry: {
    type: 'sell',
    timestamp: 1_716_367_793,
    marketId: 'm-cv-1',
    outcomeId: 'o-cv-1',
    outcomeTokenId: 1,
    amount: 75,
    price: 0.6,
  },
});

/** Provider feed claim → `predictionClaimWinnings` (positive primary, market subtitle). */
export const buildPredictClaimActivity = (): PredictActivity => ({
  id: 'activity-cv-predict-claim',
  providerId: 'polymarket',
  title: ACTIVITY_CV_PREDICT_MARKET_TITLE,
  icon: ACTIVITY_CV_PREDICT_MARKET_ICON,
  entry: {
    type: 'claimWinnings',
    timestamp: 1_716_367_794,
    amount: 250,
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

export const ACTIVITY_CV_SOLANA_ASSET_ID =
  `${ACTIVITY_CV_SOLANA_CHAIN_ID}/slip44:501` as const;

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
