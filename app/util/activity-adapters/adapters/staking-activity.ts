/**
 * Recovers staking activity kinds that the shared `@metamask/client-utils`
 * mappers leave uncategorized: `mapApiTransaction` has no pooled-staking branch
 * and `mapKeyringTransaction` has none for the keyring stake types, so both fall
 * through to `contractInteraction` on every device except the one that sent the
 * transaction
 */
import {
  TransactionType as KeyringTransactionType,
  type Transaction as NonEvmTransaction,
} from '@metamask/keyring-api';
import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import type { ActivityFee, ActivityListItem, TokenAmount } from '../types';

interface PooledStakingChain {
  contractAddress: string;
  nativeAsset: { symbol: string; decimals: number; assetId: string };
}

type StakingKind = 'stake' | 'unstake' | 'claim';

interface StakingActivityData {
  from?: string;
  token?: TokenAmount;
  fees?: ActivityFee[];
}

const ETH_DECIMALS = 18;

/**
 * Pool contract and staked asset per chain, keyed by decimal chain id to match
 * the accounts API payload. Mirrors `contractMap` in `@metamask/stake-sdk`,
 * which the package does not re-export; the asset is inlined because
 * `getNativeAssetForChainId` has no Hoodi entry.
 */
const POOLED_STAKING_BY_CHAIN_ID = new Map<number, PooledStakingChain>([
  [
    1,
    {
      contractAddress: '0x4fef9d741011476750a243ac70b9789a63dd47df',
      nativeAsset: {
        symbol: 'ETH',
        decimals: ETH_DECIMALS,
        assetId: 'eip155:1/slip44:60',
      },
    },
  ],
  [
    560048,
    {
      contractAddress: '0xe96ac18cfe5a7af8fe1fe7bc37ff110d88bc67ff',
      nativeAsset: {
        symbol: 'ETH',
        decimals: ETH_DECIMALS,
        assetId: 'eip155:560048/slip44:60',
      },
    },
  ],
]);

/** Pool selectors, derived from the SDK's `PooledStakingABI`. */
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

/**
 * The pool's internal share transfer can make a staking transaction look like a
 * swap to the mapper, which stores the amount under `sourceToken`/
 * `destinationToken` rather than `token`.
 */
function getStakingToken(
  data: ActivityListItem['data'],
  kind: StakingKind,
): TokenAmount | undefined {
  if ('token' in data && data.token) {
    return data.token;
  }
  if (kind === 'stake') {
    return 'sourceToken' in data ? data.sourceToken : undefined;
  }
  return 'destinationToken' in data ? data.destinationToken : undefined;
}

/** `to` is dropped: `claim` has no such field, and no staking row shows it. */
function getStakingActivityData(
  activity: ActivityListItem,
  kind: StakingKind,
  fallbackToken?: TokenAmount,
): StakingActivityData {
  const { data } = activity;
  const from = 'from' in data ? data.from : undefined;
  const token = getStakingToken(data, kind) ?? fallbackToken;

  return {
    ...(from ? { from } : {}),
    ...(token ? { token } : {}),
    ...(data.fees ? { fees: data.fees } : {}),
  };
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
 * `enterExitQueue` transfers no ETH — it queues shares, and the ETH arrives on
 * the later claim — so the staked asset is named without an amount, which keeps
 * the row's asset avatar without inventing a value.
 *
 * @param transaction - Raw accounts API transaction behind the activity.
 * @param activity - The activity as mapped by `mapApiTransaction`.
 * @returns The re-classified activity, or the original when the transaction is
 * not a recognized pooled staking call.
 */
export function classifyPooledStakingActivity(
  transaction: Pick<V1TransactionByHashResponse, 'chainId' | 'to' | 'methodId'>,
  activity: ActivityListItem,
): ActivityListItem {
  const chain = POOLED_STAKING_BY_CHAIN_ID.get(transaction.chainId);

  if (!chain || transaction.to?.toLowerCase() !== chain.contractAddress) {
    return activity;
  }

  const kind = POOLED_STAKING_KIND_BY_METHOD_ID.get(
    transaction.methodId?.toLowerCase() ?? '',
  );

  if (!kind) {
    return activity;
  }

  const data = getStakingActivityData(activity, kind, {
    ...chain.nativeAsset,
    assetType: 'native',
    direction: kind === 'stake' ? 'out' : 'in',
  });

  if (kind === 'stake') {
    return { ...activity, type: 'stake', data };
  }

  return kind === 'unstake'
    ? { ...activity, type: 'unstake', data }
    : { ...activity, type: 'claim', data };
}

/**
 * Re-classifies a non-EVM activity as stake/unstake from its keyring
 * transaction type. Tron staking uses native system contracts rather than a pool
 * address, so the snap-reported type is the only signal.
 *
 * @param transaction - The keyring transaction behind the activity.
 * @param activity - The activity as mapped by `mapKeyringTransaction`.
 * @returns The re-classified activity, or the original for non-staking types.
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
