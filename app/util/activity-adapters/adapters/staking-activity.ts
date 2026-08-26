/**
 * Recovers staking kinds the shared `@metamask/client-utils` mappers leave as
 * `contractInteraction`: `mapApiTransaction` has no pooled-staking branch, and
 * `mapKeyringTransaction` has none for the keyring stake types.
 */
import {
  TransactionType as KeyringTransactionType,
  type Transaction as NonEvmTransaction,
} from '@metamask/keyring-api';
import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import type { ActivityFee, ActivityListItem, TokenAmount } from '../types';
import {
  mobileActivityAdapterEnvironment,
  type ActivityAdapterEnvironment,
} from './environment';

type StakingKind = 'stake' | 'unstake' | 'claim';

type ApiStakingTransaction = Pick<
  V1TransactionByHashResponse,
  'chainId' | 'to' | 'methodId' | 'gasUsed' | 'effectiveGasPrice'
>;

const NATIVE_FEE_DECIMALS = 18;

interface StakingActivityData {
  from?: string;
  token?: TokenAmount;
  fees?: ActivityFee[];
}

/** Mirrors `contractMap` in `@metamask/stake-sdk`, which it does not export. */
const POOLED_STAKING_CONTRACT_BY_CHAIN_ID = new Map<number, string>([
  [1, '0x4fef9d741011476750a243ac70b9789a63dd47df'],
  [560048, '0xe96ac18cfe5a7af8fe1fe7bc37ff110d88bc67ff'],
]);

const POOLED_STAKING_KIND_BY_METHOD_ID = new Map<string, StakingKind>([
  ['0xf9609f08', 'stake'], // deposit(address,address)
  ['0x8ceab9aa', 'unstake'], // enterExitQueue(uint256,address)
  ['0x8697d2c2', 'claim'], // claimExitedAssets(uint256,uint256,uint256)
  ['0xac9650d8', 'claim'], // multicall(bytes[]) — batched claims, see usePoolStakedClaim
]);

const KEYRING_STAKING_KIND_BY_TYPE = new Map<string, 'stake' | 'unstake'>([
  [KeyringTransactionType.StakeDeposit, 'stake'],
  [KeyringTransactionType.StakeWithdraw, 'unstake'],
]);

/** The pool's share transfer can look like a swap, moving the amount off `token`. */
function getStakingToken(
  data: ActivityListItem['data'],
  kind: StakingKind,
): TokenAmount | undefined {
  const isStake = kind === 'stake';
  let token: TokenAmount | undefined;

  if ('token' in data && data.token) {
    token = data.token;
  } else if (isStake) {
    token = 'sourceToken' in data ? data.sourceToken : undefined;
  } else {
    token = 'destinationToken' in data ? data.destinationToken : undefined;
  }

  // A token pointing against the kind is the pool's share leg, not the amount.
  return token?.direction === (isStake ? 'out' : 'in') ? token : undefined;
}

/** `to` is dropped: `claim` has no such field, and no staking row shows it. */
function getStakingActivityData(
  activity: ActivityListItem,
  kind: StakingKind,
  fallbackFees?: ActivityFee[],
): StakingActivityData {
  const { data } = activity;
  const from = 'from' in data ? data.from : undefined;
  const token = getStakingToken(data, kind);
  const fees = data.fees?.length ? data.fees : fallbackFees;

  return {
    ...(from ? { from } : {}),
    ...(token ? { token } : {}),
    ...(fees ? { fees } : {}),
  };
}

/** The `contractInteraction` branch skips `getFees`, unlike every other branch. */
function getNetworkFees(
  transaction: ApiStakingTransaction,
  environment: ActivityAdapterEnvironment,
): ActivityFee[] | undefined {
  let amount: string;
  try {
    amount = (
      BigInt(transaction.gasUsed) * BigInt(transaction.effectiveGasPrice)
    ).toString();
  } catch {
    return undefined;
  }

  if (amount === '0') {
    return undefined;
  }

  const nativeAsset = environment.getNativeAssetForChainId(
    `0x${transaction.chainId.toString(16)}`,
  );

  return [
    {
      type: 'base',
      amount,
      decimals: NATIVE_FEE_DECIMALS,
      assetType: 'native',
      ...(nativeAsset?.symbol ? { symbol: nativeAsset.symbol } : {}),
      ...(nativeAsset?.assetId ? { assetId: nativeAsset.assetId } : {}),
    },
  ];
}

function getMovementToken(
  movements: NonEvmTransaction['from'],
  direction: TokenAmount['direction'],
): TokenAmount | undefined {
  for (const { asset } of movements) {
    if (asset && asset.fungible) {
      return {
        amount: asset.amount,
        symbol: asset.unit,
        assetId: asset.type,
        direction,
      };
    }
  }
  return undefined;
}

/**
 * Re-classifies an API-sourced activity as stake/unstake/claim when it targets
 * the pooled staking contract with a known selector.
 *
 * @returns The original activity when it is not a recognized staking call.
 */
export function classifyPooledStakingActivity(
  transaction: ApiStakingTransaction,
  activity: ActivityListItem,
  environment: ActivityAdapterEnvironment = mobileActivityAdapterEnvironment,
): ActivityListItem {
  const contractAddress = POOLED_STAKING_CONTRACT_BY_CHAIN_ID.get(
    transaction.chainId,
  );

  if (!contractAddress || transaction.to?.toLowerCase() !== contractAddress) {
    return activity;
  }

  const kind = POOLED_STAKING_KIND_BY_METHOD_ID.get(
    transaction.methodId?.toLowerCase() ?? '',
  );

  if (!kind) {
    return activity;
  }

  const data = getStakingActivityData(
    activity,
    kind,
    getNetworkFees(transaction, environment),
  );

  if (kind === 'stake') {
    return { ...activity, type: 'stake', data };
  }

  return kind === 'unstake'
    ? { ...activity, type: 'unstake', data }
    : { ...activity, type: 'claim', data };
}

/**
 * Re-classifies a non-EVM activity from its keyring transaction type. Tron
 * staking uses native system contracts, so there is no pool address to match.
 *
 * @returns The original activity for non-staking types.
 */
export function classifyKeyringStakingActivity(
  transaction: NonEvmTransaction,
  activity: ActivityListItem,
): ActivityListItem {
  const kind = KEYRING_STAKING_KIND_BY_TYPE.get(transaction.type);

  if (!kind) {
    return activity;
  }

  const token =
    kind === 'stake'
      ? getMovementToken(transaction.from, 'out')
      : getMovementToken(transaction.to, 'in');

  const data = {
    ...getStakingActivityData(activity, kind),
    ...(token ? { token } : {}),
  };

  return kind === 'stake'
    ? { ...activity, type: 'stake', data }
    : { ...activity, type: 'unstake', data };
}
