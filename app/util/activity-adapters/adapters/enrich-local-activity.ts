import { TransactionType } from '@metamask/transaction-controller';
import { KnownCaipNamespace, toCaipChainId, type Hex } from '@metamask/utils';
import { getClaimPayoutFromReceipt } from '../../../components/UI/Earn/utils/musd';
import {
  MUSD_DECIMALS,
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../../components/UI/Earn/constants/musd';
import type { ActivityListItem, TokenAmount } from '../types';
import type { TransactionGroup } from './transaction-group';
import {
  getKnownTokenMetadata,
  getLocalActivityFees,
  getLocalTransactionStatus,
  getTokenApprovalAmountFromData,
  isUnlimitedApprovalAmount,
} from './helpers';
import {
  mobileActivityAdapterEnvironment,
  type ActivityAdapterEnvironment,
} from './environment';

const tokenTransferTypes = new Set<TransactionType>([
  TransactionType.tokenMethodTransfer,
  TransactionType.tokenMethodTransferFrom,
  TransactionType.tokenMethodSafeTransferFrom,
]);

const evmNativeDecimals = 18;
const predictCollateralDecimals = 6;
const predictCollateralSymbol = 'USDC';
const erc20TransferSelector = '0xa9059cbb';
const perpsDepositTypes: TransactionType[] = [
  TransactionType.perpsDeposit,
  TransactionType.perpsDepositAndOrder,
];
const perpsWithdrawTypes: TransactionType[] = [TransactionType.perpsWithdraw];

function getNativeTokenAmount(
  transactionGroup: TransactionGroup,
  direction: TokenAmount['direction'],
  amount?: string,
  environment: ActivityAdapterEnvironment = mobileActivityAdapterEnvironment,
): TokenAmount | undefined {
  const { initialTransaction, nativeAssetSymbol } = transactionGroup;
  const nativeAsset = environment.getNativeAssetForChainId(
    initialTransaction.chainId,
  );
  const symbol = nativeAssetSymbol ?? nativeAsset?.symbol;
  if (symbol === undefined) {
    return undefined;
  }

  const chainId = toCaipChainId(
    KnownCaipNamespace.Eip155,
    Number.parseInt(initialTransaction.chainId, 16).toString(),
  );

  const assetId =
    nativeAsset?.assetId ??
    environment.toAssetId(environment.nativeTokenAddress, chainId);

  return {
    direction,
    symbol,
    ...(amount ? { amount } : {}),
    ...(assetId ? { assetId } : {}),
    decimals: nativeAsset?.decimals ?? evmNativeDecimals,
  };
}

function resolveTransactionType(
  transactionGroup: TransactionGroup,
): TransactionType | undefined {
  const { type, originalType } = transactionGroup.initialTransaction;
  return type === TransactionType.retry ? (originalType ?? type) : type;
}

function hasTransactionType(
  candidate:
    | { type?: TransactionType; originalType?: TransactionType }
    | undefined,
  types: TransactionType[],
): boolean {
  return Boolean(
    candidate &&
      ((candidate.type && types.includes(candidate.type)) ||
        (candidate.originalType && types.includes(candidate.originalType))),
  );
}

function getNestedTransferAmount(data: string | undefined): string | undefined {
  if (
    !data ||
    !data.toLowerCase().startsWith(erc20TransferSelector) ||
    data.length < 138
  ) {
    return undefined;
  }

  try {
    return BigInt(`0x${data.slice(74, 138)}`).toString();
  } catch {
    return undefined;
  }
}

function getPredictFundsToken(
  fundsTx: { to?: string; data?: string },
  direction: TokenAmount['direction'],
  chainId: ActivityListItem['chainId'],
  environment: ActivityAdapterEnvironment,
): TokenAmount {
  const contractAddress = fundsTx.to;
  const tokenMetadata = contractAddress
    ? getKnownTokenMetadata(chainId, contractAddress, environment)
    : undefined;
  const assetId = contractAddress
    ? environment.toAssetId(contractAddress, chainId)
    : undefined;
  const amount = getNestedTransferAmount(fundsTx.data);

  return {
    direction,
    symbol: tokenMetadata?.symbol ?? predictCollateralSymbol,
    decimals: tokenMetadata?.decimals ?? predictCollateralDecimals,
    ...(assetId ? { assetId } : {}),
    ...(amount ? { amount } : {}),
  };
}

function enrichLocalActivityKind(
  activity: ActivityListItem,
  transactionGroup: TransactionGroup,
  environment: ActivityAdapterEnvironment,
): ActivityListItem {
  const { initialTransaction } = transactionGroup;
  const transactionType = resolveTransactionType(transactionGroup);
  const fees = 'fees' in activity.data ? activity.data.fees : undefined;
  const from = initialTransaction.txParams.from ?? '';
  const to = initialTransaction.txParams.to ?? '';

  switch (transactionType) {
    case TransactionType.stakingClaim:
      return {
        ...activity,
        type: 'claim',
        data: {
          ...(fees ? { fees } : {}),
        },
      };
    case TransactionType.stakingUnstake:
      return {
        ...activity,
        type: 'unstake',
        data: {
          ...(fees ? { fees } : {}),
        },
      };
    case TransactionType.deployContract:
      return {
        ...activity,
        type: 'contractDeployment',
        data: {
          from,
          to,
          ...(fees ? { fees } : {}),
        },
      };
    case TransactionType.lendingWithdraw:
      return {
        ...activity,
        type: 'lendingWithdrawal',
        data: {
          ...(fees ? { fees } : {}),
        },
      };
    default:
      break;
  }

  if (initialTransaction.txParams.authorizationList?.length) {
    return {
      ...activity,
      type: 'smartAccountUpgrade',
      data: {
        from,
        to,
        ...(fees ? { fees } : {}),
      },
    };
  }

  const nested = initialTransaction.nestedTransactions ?? [];
  const hasPredictDeposit = nested.some(
    (call) =>
      call.type === TransactionType.predictDeposit ||
      call.type === TransactionType.predictDepositAndOrder,
  );
  const hasPredictWithdraw = nested.some(
    (call) => call.type === TransactionType.predictWithdraw,
  );
  if (hasPredictDeposit || hasPredictWithdraw) {
    const fundsTx = nested.find((call) =>
      hasPredictDeposit
        ? call.type === TransactionType.predictDeposit ||
          call.type === TransactionType.predictDepositAndOrder
        : call.type === TransactionType.predictWithdraw,
    );

    return {
      ...activity,
      type: hasPredictDeposit
        ? 'predictionsAddFunds'
        : 'predictionsWithdrawFunds',
      data: {
        token: fundsTx
          ? getPredictFundsToken(
              fundsTx,
              hasPredictDeposit ? 'in' : 'out',
              activity.chainId,
              environment,
            )
          : undefined,
        ...(fees ? { fees } : {}),
      },
    };
  }

  const isTopLevelPerps =
    hasTransactionType(initialTransaction, perpsDepositTypes) ||
    hasTransactionType(initialTransaction, perpsWithdrawTypes) ||
    hasTransactionType(
      transactionGroup.primaryTransaction,
      perpsDepositTypes,
    ) ||
    hasTransactionType(transactionGroup.primaryTransaction, perpsWithdrawTypes);
  if (!isTopLevelPerps) {
    const hasPerpsDeposit = nested.some((call) =>
      hasTransactionType(call, perpsDepositTypes),
    );
    const hasPerpsWithdraw =
      !hasPerpsDeposit &&
      nested.some((call) => hasTransactionType(call, perpsWithdrawTypes));
    if (hasPerpsDeposit || hasPerpsWithdraw) {
      return {
        ...activity,
        type: hasPerpsDeposit ? 'perpsAddFunds' : 'perpsWithdraw',
        data: {
          from,
          ...(fees ? { fees } : {}),
        },
      };
    }
  }

  return activity;
}

function enrichSwapIncomplete(
  activity: ActivityListItem,
  transactionGroup: TransactionGroup,
): ActivityListItem {
  const transactionType = resolveTransactionType(transactionGroup);

  if (
    (transactionType !== TransactionType.swap &&
      transactionType !== TransactionType.swapAndSend) ||
    activity.type !== 'swap'
  ) {
    return activity;
  }

  if (transactionGroup.destinationToken?.symbol !== undefined) {
    return activity;
  }

  return {
    ...activity,
    type: 'swapIncomplete',
    data: {
      sourceToken: transactionGroup.sourceToken ?? activity.data.sourceToken,
    },
  };
}

function enrichStakingDeposit(
  activity: ActivityListItem,
  transactionGroup: TransactionGroup,
  environment: ActivityAdapterEnvironment,
): ActivityListItem {
  if (
    transactionGroup.initialTransaction.type !== TransactionType.stakingDeposit
  ) {
    return activity;
  }

  return {
    ...activity,
    type: 'stake',
    data: {
      token: getNativeTokenAmount(
        transactionGroup,
        'out',
        transactionGroup.initialTransaction.txParams.value,
        environment,
      ),
      ...('fees' in activity.data && activity.data.fees
        ? { fees: activity.data.fees }
        : {}),
    },
  };
}

function enrichMusdClaim(
  activity: ActivityListItem,
  transactionGroup: TransactionGroup,
  environment: ActivityAdapterEnvironment,
): ActivityListItem {
  if (
    activity.type !== 'claimMusdBonus' ||
    transactionGroup.initialTransaction.type !== TransactionType.musdClaim
  ) {
    return activity;
  }

  const { initialTransaction, primaryTransaction } = transactionGroup;
  const claimAmountRaw = getClaimPayoutFromReceipt(
    primaryTransaction.txReceipt?.logs,
    initialTransaction.txParams.from,
  );
  const chainId = activity.chainId;

  return {
    ...activity,
    data: {
      ...activity.data,
      ...(claimAmountRaw
        ? {
            token: {
              amount: claimAmountRaw,
              assetId:
                MUSD_TOKEN_ASSET_ID_BY_CHAIN[
                  initialTransaction.chainId as Hex
                ] ?? environment.toAssetId(MUSD_TOKEN_ADDRESS, chainId),
              decimals: MUSD_DECIMALS,
              direction: 'in',
              symbol: MUSD_TOKEN.symbol,
            },
          }
        : {}),
    },
  };
}

function enrichTokenTransferActivity(
  activity: ActivityListItem,
  transactionGroup: TransactionGroup,
  environment: ActivityAdapterEnvironment,
): ActivityListItem {
  if (activity.type !== 'send') {
    return activity;
  }

  const { type, txParams, transferInformation } =
    transactionGroup.initialTransaction;
  const data = txParams?.data;

  if (!type || !tokenTransferTypes.has(type) || !data) {
    return activity;
  }

  const transactionData = environment.parseStandardTokenTransactionData(data);
  const recipient = transactionData?.args?._to ?? transactionData?.args?.to;
  const parsedAmount =
    transactionData?.args?._value ?? transactionData?.args?.value;
  let amount: string | undefined;
  if (
    transferInformation?.amount !== undefined &&
    transferInformation.amount !== null
  ) {
    amount = String(transferInformation.amount);
  } else if (parsedAmount !== undefined && parsedAmount !== null) {
    amount = parsedAmount.toString();
  }

  const symbol =
    transferInformation?.symbol ??
    transactionGroup.contractTokenMetadata?.symbol ??
    activity.data.token?.symbol;
  const decimals =
    transferInformation?.decimals ??
    transactionGroup.contractTokenMetadata?.decimals ??
    activity.data.token?.decimals;

  const nextTo =
    typeof recipient === 'string' && recipient !== activity.data.to
      ? recipient
      : activity.data.to;

  if (
    nextTo === activity.data.to &&
    amount === activity.data.token?.amount &&
    symbol === activity.data.token?.symbol &&
    decimals === activity.data.token?.decimals
  ) {
    return activity;
  }

  return {
    ...activity,
    data: {
      ...activity.data,
      to: nextTo,
      token: {
        direction: activity.data.token?.direction ?? 'out',
        ...(activity.data.token?.assetId
          ? { assetId: activity.data.token.assetId }
          : {}),
        ...(symbol ? { symbol } : {}),
        ...(decimals === undefined ? {} : { decimals }),
        ...(amount ? { amount } : {}),
      },
    },
  };
}

function enrichApprovalActivity(
  activity: ActivityListItem,
  transactionGroup: TransactionGroup,
): ActivityListItem {
  if (
    activity.type !== 'approveSpendingCap' &&
    activity.type !== 'increaseSpendingCap' &&
    activity.type !== 'revokeSpendingCap'
  ) {
    return activity;
  }

  const data = transactionGroup.initialTransaction.txParams?.data;
  const token = activity.data.token;
  const isUnlimited = isUnlimitedApprovalAmount(token?.amount, token?.decimals);
  let next: ActivityListItem = activity;

  if (activity.type === 'approveSpendingCap' && data) {
    const approveAmount = getTokenApprovalAmountFromData(data);
    if (approveAmount === '0') {
      next = {
        ...activity,
        type: 'revokeSpendingCap',
      };
    }
  }

  if (!isUnlimited || next.data.token?.isUnlimitedApproval) {
    return next;
  }

  return {
    ...next,
    data: {
      ...next.data,
      token: next.data.token
        ? { ...next.data.token, isUnlimitedApproval: true }
        : next.data.token,
    },
  };
}

function enrichPreparedFees(
  activity: ActivityListItem,
  transactionGroup: TransactionGroup,
): ActivityListItem {
  const fees = transactionGroup.fees;
  if (!fees?.length) {
    return activity;
  }

  if ('fees' in activity.data && activity.data.fees?.length) {
    return activity;
  }

  return {
    ...activity,
    data: {
      ...activity.data,
      fees,
    },
  };
}

function enrichCancelledStatus(
  activity: ActivityListItem,
  transactionGroup: TransactionGroup,
  environment: ActivityAdapterEnvironment,
): ActivityListItem {
  const mobileStatus = getLocalTransactionStatus(transactionGroup, environment);
  if (mobileStatus !== 'cancelled' || activity.status === 'cancelled') {
    return activity;
  }

  return {
    ...activity,
    status: 'cancelled',
  };
}

export function enrichLocalActivity(
  activity: ActivityListItem,
  transactionGroup: TransactionGroup,
  environment: ActivityAdapterEnvironment = mobileActivityAdapterEnvironment,
): ActivityListItem {
  let next = activity;
  next = enrichLocalActivityKind(next, transactionGroup, environment);
  next = enrichTokenTransferActivity(next, transactionGroup, environment);
  next = enrichApprovalActivity(next, transactionGroup);
  next = enrichSwapIncomplete(next, transactionGroup);
  next = enrichStakingDeposit(next, transactionGroup, environment);
  next = enrichMusdClaim(next, transactionGroup, environment);
  next = enrichCancelledStatus(next, transactionGroup, environment);
  next = enrichPreparedFees(next, transactionGroup);
  return next;
}

export function prepareLocalTransactionGroup(
  transactionGroup: TransactionGroup,
  environment: ActivityAdapterEnvironment = mobileActivityAdapterEnvironment,
): TransactionGroup {
  if (transactionGroup.fees) {
    return transactionGroup;
  }

  const nativeAsset = environment.getNativeAssetForChainId(
    transactionGroup.initialTransaction.chainId,
  );
  const fees = getLocalActivityFees(
    transactionGroup,
    nativeAsset,
    transactionGroup.nativeAssetSymbol ?? nativeAsset?.symbol,
    environment,
  );

  return fees ? { ...transactionGroup, fees } : transactionGroup;
}
