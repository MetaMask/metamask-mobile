/*
 * Vendored from metamask-extension shared/lib/activity/adapters/helpers.ts
 * Branch: origin/n3ps/activity-v3-prototype
 * TODO: Replace with shared @metamask/activity-adapters package when published.
 *
 * Extension dependencies are provided via ActivityAdapterEnvironment.
 */
import type { CaipChainId, Hex } from '@metamask/utils';
import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type { TransactionGroup } from './transaction-group';
import type { ActivityFee, Status } from '../types';
import { GAS_FEE_SPONSORED } from '../fees';
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
function getNetworkFeeAmount(
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
 * Determines whether a transaction should display its network fee as sponsored.
 *
 * Mirrors the existing transaction-details sponsorship rules: the transaction
 * must be marked as gas-sponsored, while hardware wallets, revoke-delegation
 * transactions, terminal transactions with no gas paid, and failed
 * transactions with no gas used are not shown as paid by MetaMask.
 */
function isTransactionGasFeeSponsored({
  transaction,
  isHardwareWalletAccount = false,
}: {
  transaction: TransactionMeta | undefined;
  isHardwareWalletAccount?: boolean;
}): boolean {
  if (!transaction) {
    return false;
  }

  const { isGasFeeSponsored, status, type } = transaction;

  return Boolean(
    isGasFeeSponsored &&
      type !== TransactionType.revokeDelegation &&
      !isHardwareWalletAccount &&
      status !== TransactionStatus.rejected &&
      status !== TransactionStatus.dropped &&
      !(status === TransactionStatus.failed && !transaction.txReceipt?.gasUsed),
  );
}

/**
 * Builds the base network fee (in the chain's native token) for a local
 * transaction from its receipt (`gasUsed × effectiveGasPrice`), falling back to
 * `txParams.gasPrice` while pending. Mirrors the extension's
 * `getLocalTransactionFees` + `buildBaseNetworkFee`.
 */
function getLocalTransactionFees(
  transactionGroup: Pick<TransactionGroup, 'primaryTransaction'> &
    Partial<
      Pick<TransactionGroup, 'initialTransaction' | 'isHardwareWalletAccount'>
    >,
  nativeAsset: ActivityTokenMetadata | undefined,
  nativeSymbol: string | undefined,
): ActivityFee[] | undefined {
  const {
    initialTransaction,
    isHardwareWalletAccount = false,
    primaryTransaction,
  } = transactionGroup;
  const transaction =
    primaryTransaction.isGasFeeSponsored || !initialTransaction
      ? primaryTransaction
      : initialTransaction;

  if (
    isTransactionGasFeeSponsored({
      transaction,
      isHardwareWalletAccount,
    })
  ) {
    return [{ type: GAS_FEE_SPONSORED }];
  }

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

/**
 * Fee paid with a selected gas fee token (ERC-20). Shown on the primary
 * Activity row so STX `gas_payment` siblings can be hidden (TMCU-1064).
 *
 * Skips the native sentinel (`0x000…000`) — confirmations may select it for
 * STX while gas is still paid in native — and skips terminal-fail statuses so
 * quoted unpaid gas is not shown on dropped/rejected/failed sends.
 */
function getLocalGasTokenFee(
  transaction: TransactionGroup['primaryTransaction'],
  environment: ActivityAdapterEnvironment = mobileActivityAdapterEnvironment,
): ActivityFee | undefined {
  const { selectedGasFeeToken, gasFeeTokens, chainId, status } = transaction;
  if (!selectedGasFeeToken || !gasFeeTokens?.length) {
    return undefined;
  }

  if (
    environment.equalsIgnoreCase(
      selectedGasFeeToken,
      environment.nativeTokenAddress,
    )
  ) {
    return undefined;
  }

  if (
    status === TransactionStatus.failed ||
    status === TransactionStatus.dropped ||
    status === TransactionStatus.rejected ||
    status === TransactionStatus.cancelled
  ) {
    return undefined;
  }

  const gasFeeToken = gasFeeTokens.find((token) =>
    environment.equalsIgnoreCase(token.tokenAddress, selectedGasFeeToken),
  );
  if (!gasFeeToken?.amount) {
    return undefined;
  }

  let amount: string;
  try {
    amount = BigInt(gasFeeToken.amount).toString(10);
  } catch {
    return undefined;
  }

  const assetId = environment.toAssetId(gasFeeToken.tokenAddress, chainId);

  return {
    type: 'gasToken',
    amount,
    decimals: gasFeeToken.decimals,
    ...(gasFeeToken.symbol ? { symbol: gasFeeToken.symbol } : {}),
    ...(assetId ? { assetId } : {}),
  };
}

/**
 * Fees for local Activity rows. When a gas fee token is selected, only that
 * fee is shown (native base is omitted — the user paid with the token).
 * Otherwise returns the native network fee.
 */
export function getLocalActivityFees(
  transactionGroup: Pick<TransactionGroup, 'primaryTransaction'>,
  nativeAsset: ActivityTokenMetadata | undefined,
  nativeSymbol: string | undefined,
  environment: ActivityAdapterEnvironment = mobileActivityAdapterEnvironment,
): ActivityFee[] | undefined {
  const gasTokenFee = getLocalGasTokenFee(
    transactionGroup.primaryTransaction,
    environment,
  );
  if (gasTokenFee) {
    return [gasTokenFee];
  }
  return getLocalTransactionFees(transactionGroup, nativeAsset, nativeSymbol);
}

const MAINNET_HEX_CHAIN_ID = '0x1';
const TOKEN_VALUE_UNLIMITED_THRESHOLD = 10 ** 15;

export const isNftTransferType = (transferType?: string) => {
  const normalizedTransferType = transferType?.toLowerCase();
  return (
    normalizedTransferType === 'erc721' || normalizedTransferType === 'erc1155'
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
    statusKey === environment.transactionGroupStatus.cancelled
  ) {
    return 'cancelled';
  }

  if (
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
