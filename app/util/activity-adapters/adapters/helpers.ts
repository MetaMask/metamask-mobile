/*
 * Vendored from metamask-extension shared/lib/activity/adapters/helpers.ts
 * Branch: origin/n3ps/activity-v3-prototype
 * TODO: Replace with shared @metamask/activity-adapters package when published.
 *
 * Extension dependencies are provided via ActivityAdapterEnvironment.
 */
import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import type { CaipChainId, Hex } from '@metamask/utils';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import type { TransactionGroup } from './transaction-group';
import type { ActivityFee, Status, TokenAmount } from '../types';
import {
  mobileActivityAdapterEnvironment,
  type ActivityAdapterEnvironment,
  type ActivityTokenMetadata,
} from './environment';

const NATIVE_FEE_DECIMALS = 18;

/**
 * Computes the network (gas) fee in wei as a decimal string from a gas amount
 * and gas price (both accepted as hex or decimal). Mirrors the extension's
 * `toNetworkFeeAmount`.
 */
export function getNetworkFeeAmount(
  gasUsed: string | undefined,
  gasPrice: string | undefined,
): string | undefined {
  if (gasUsed === undefined || gasPrice === undefined) {
    return undefined;
  }
  try {
    return String(BigInt(gasUsed) * BigInt(gasPrice));
  } catch {
    return undefined;
  }
}

/**
 * Builds the base network fee (in the chain's native token) for a local
 * transaction from its receipt (`gasUsed × effectiveGasPrice`), falling back to
 * `txParams.gasPrice` while pending. Mirrors the extension's
 * `getLocalTransactionFees` + `buildBaseNetworkFee`.
 */
export function getLocalTransactionFees(
  transactionGroup: Pick<TransactionGroup, 'primaryTransaction'>,
  nativeAsset: ActivityTokenMetadata | undefined,
  nativeSymbol: string | undefined,
): ActivityFee[] | undefined {
  const { primaryTransaction } = transactionGroup;
  const amount = getNetworkFeeAmount(
    primaryTransaction.txReceipt?.gasUsed,
    primaryTransaction.txReceipt?.effectiveGasPrice ??
      primaryTransaction.txParams?.gasPrice,
  );

  if (!amount) {
    return undefined;
  }

  return [
    {
      type: 'base',
      amount,
      decimals: nativeAsset?.decimals ?? NATIVE_FEE_DECIMALS,
      ...(nativeSymbol ? { symbol: nativeSymbol } : {}),
      ...(nativeAsset?.assetId ? { assetId: nativeAsset.assetId } : {}),
    },
  ];
}

export function getApiTransactionFees(
  transaction: V1TransactionByHashResponse,
  nativeAsset: ActivityTokenMetadata | undefined,
): ActivityFee[] | undefined {
  const amount = getNetworkFeeAmount(
    transaction.gasUsed?.toString(),
    transaction.effectiveGasPrice?.toString(),
  );

  if (!amount) {
    return undefined;
  }

  return [
    {
      type: 'base',
      amount,
      decimals: nativeAsset?.decimals ?? NATIVE_FEE_DECIMALS,
      ...(nativeAsset?.symbol ? { symbol: nativeAsset.symbol } : {}),
      ...(nativeAsset?.assetId ? { assetId: nativeAsset.assetId } : {}),
    },
  ];
}

const MAINNET_HEX_CHAIN_ID = '0x1';
const TOKEN_VALUE_UNLIMITED_THRESHOLD = 10 ** 15;

export type ValueTransfer = NonNullable<
  V1TransactionByHashResponse['valueTransfers']
>[number];

export const normalizeTransferType = (transferType?: string) =>
  transferType?.toLowerCase();

export const isNftTransferType = (transferType?: string) => {
  const normalizedTransferType = normalizeTransferType(transferType);
  return (
    normalizedTransferType === 'erc721' || normalizedTransferType === 'erc1155'
  );
};

export const isNativeTransferType = (transferType?: string) => {
  const normalizedTransferType = normalizeTransferType(transferType);
  return (
    normalizedTransferType === 'normal' ||
    normalizedTransferType === 'native' ||
    normalizedTransferType === 'internal'
  );
};

function stringifyParsedTokenAmount(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (
    value &&
    typeof value === 'object' &&
    'toString' in value &&
    typeof value.toString === 'function'
  ) {
    const stringValue = value.toString();
    return stringValue === '[object Object]' ? undefined : stringValue;
  }

  return undefined;
}

export function getTokenApprovalAmountFromData(
  data: string | undefined,
  environment: ActivityAdapterEnvironment = mobileActivityAdapterEnvironment,
): string | undefined {
  const parsedTransactionData = data
    ? environment.parseStandardTokenTransactionData(data)
    : undefined;
  const args = parsedTransactionData?.args;

  if (!args) {
    return undefined;
  }

  return stringifyParsedTokenAmount(
    args._value ?? args.value ?? args.amount ?? args[1],
  );
}

export function isUnlimitedApprovalAmount(
  amount: string | undefined,
  decimals = 0,
): boolean {
  if (!amount) {
    return false;
  }

  return (
    Number.parseFloat(amount) / 10 ** decimals > TOKEN_VALUE_UNLIMITED_THRESHOLD
  );
}

const resolveAssetId = (
  chainId: CaipChainId,
  {
    contractAddress,
    transferType,
  }: {
    contractAddress?: string;
    transferType?: string;
  },
  environment: ActivityAdapterEnvironment,
): string | undefined => {
  if (contractAddress) {
    return environment.toAssetId(contractAddress, chainId);
  }

  if (isNativeTransferType(transferType)) {
    return environment.toAssetId(environment.nativeTokenAddress, chainId);
  }

  return undefined;
};

function getTransactionStatusKey(
  transaction: TransactionGroup['primaryTransaction'],
  environment: ActivityAdapterEnvironment,
): string {
  const {
    txReceipt: { status: receiptStatus } = {},
    type,
    status,
  } = transaction;

  if (receiptStatus === '0x0') {
    return TransactionStatus.failed;
  }

  if (
    status === TransactionStatus.confirmed &&
    type === TransactionType.cancel
  ) {
    return environment.transactionGroupStatus.cancelled;
  }

  return transaction.status;
}

export function getLocalTransactionStatus(
  {
    primaryTransaction,
    initialTransaction,
  }: {
    primaryTransaction: TransactionGroup['primaryTransaction'];
    initialTransaction: TransactionGroup['initialTransaction'];
  },
  environment: ActivityAdapterEnvironment = mobileActivityAdapterEnvironment,
): Status {
  if (initialTransaction.isSmartTransaction) {
    const smartStatus = initialTransaction.status as string | undefined;

    if (smartStatus === environment.smartTransactionStatus.pending) {
      return 'pending';
    }

    if (smartStatus === environment.smartTransactionStatus.success) {
      return 'success';
    }

    if (smartStatus === environment.smartTransactionStatus.cancelled) {
      return 'failed';
    }

    return 'pending';
  }

  const statusKey = getTransactionStatusKey(primaryTransaction, environment);

  if (statusKey === TransactionStatus.confirmed) {
    return 'success';
  }

  if (
    statusKey === TransactionStatus.cancelled ||
    statusKey === environment.transactionGroupStatus.cancelled ||
    statusKey === TransactionStatus.dropped ||
    statusKey === TransactionStatus.failed ||
    statusKey === TransactionStatus.rejected
  ) {
    return 'failed';
  }

  if (environment.inProgressTransactionStatuses.includes(statusKey)) {
    return 'pending';
  }

  return 'pending';
}

export function getKnownTokenMetadata(
  chainId: CaipChainId | Hex,
  contractAddress?: string,
  environment: ActivityAdapterEnvironment = mobileActivityAdapterEnvironment,
) {
  if (contractAddress === undefined) {
    return undefined;
  }

  const assetId = environment.toAssetId(contractAddress, chainId);
  const tokenMetadata =
    (chainId === MAINNET_HEX_CHAIN_ID || assetId?.startsWith('eip155:1/')
      ? environment.staticMainnetTokenList[contractAddress.toLowerCase()]
      : undefined) ??
    Object.values(environment.bridgeChainIdCommonTokenPair).find(
      (token) =>
        token?.assetId !== undefined &&
        assetId !== undefined &&
        environment.equalsIgnoreCase(token.assetId, assetId),
    );

  return tokenMetadata
    ? { ...tokenMetadata, ...(assetId ? { assetId } : {}) }
    : undefined;
}

export function getTokenMetadataFromKnownToken(
  contractAddress: string | undefined,
  direction: TokenAmount['direction'],
  chainId: CaipChainId | Hex,
  environment: ActivityAdapterEnvironment = mobileActivityAdapterEnvironment,
) {
  const tokenMetadata = getKnownTokenMetadata(
    chainId,
    contractAddress,
    environment,
  );

  if (!tokenMetadata) {
    return undefined;
  }

  return {
    direction,
    ...(tokenMetadata.symbol ? { symbol: tokenMetadata.symbol } : {}),
    ...(tokenMetadata.decimals === undefined
      ? {}
      : { decimals: tokenMetadata.decimals }),
    ...(tokenMetadata.assetId ? { assetId: tokenMetadata.assetId } : {}),
  };
}

export function getTokenAmountFromTransfer(
  transfer: ValueTransfer | undefined,
  direction: TokenAmount['direction'],
  chainId: CaipChainId,
  environment: ActivityAdapterEnvironment = mobileActivityAdapterEnvironment,
) {
  if (!transfer?.symbol && transfer?.amount === undefined) {
    return undefined;
  }

  const isNftTransfer = isNftTransferType(transfer?.transferType);

  const assetId =
    transfer && !isNftTransfer
      ? resolveAssetId(
          chainId,
          {
            contractAddress: transfer.contractAddress,
            transferType: transfer.transferType,
          },
          environment,
        )
      : undefined;

  return {
    direction,
    ...(transfer.amount === null || transfer.amount === undefined
      ? {}
      : { amount: String(transfer.amount) }),
    ...(transfer.decimal === undefined ? {} : { decimals: transfer.decimal }),
    ...(transfer.symbol ? { symbol: transfer.symbol } : {}),
    ...(assetId ? { assetId } : {}),
  };
}

/**
 * When the transfer omits contractAddress, fall back to the indexed tx `to` field.
 *
 * @param token - Parsed token amount from the value transfer.
 * @param fallbackContractAddress - Indexed transaction `to` address used as ERC-20 fallback.
 * @param transferType - Value transfer type; native (`normal`) transfers skip the fallback.
 * @param chainId - CAIP-2 chain id for asset id encoding.
 * @returns Token amount with `assetId` set when a fallback address applies.
 */
export function withFallbackTokenAssetId(
  token: TokenAmount | undefined,
  fallbackContractAddress: string | undefined,
  transferType: string | undefined,
  chainId: CaipChainId,
  environment: ActivityAdapterEnvironment = mobileActivityAdapterEnvironment,
): TokenAmount | undefined {
  if (
    !token ||
    token.assetId ||
    isNativeTransferType(transferType) ||
    !fallbackContractAddress
  ) {
    return token;
  }

  const assetId = environment.toAssetId(fallbackContractAddress, chainId);
  if (!assetId) {
    return token;
  }

  return { ...token, assetId };
}
