import { fromTokenMinimalUnitString } from '../../../util/number/bigint';

/**
 * A single balance update entry inside an
 * `AccountActivityService:balanceUpdated` push notification.
 */
export interface BalanceUpdatePushEntry {
  asset?: { type?: string; unit?: string; decimals?: number };
  postBalance?: { amount?: string };
}

/**
 * Payload emitted by `AccountActivityService:balanceUpdated`.
 */
export interface BalanceUpdatedPushPayload {
  address: string;
  chain: string;
  updates: BalanceUpdatePushEntry[];
}

/**
 * Merge payload accepted by `AssetsController.handleAssetsUpdate`.
 */
export interface AssetsBalanceMergeUpdate {
  updateMode: 'merge';
  assetsBalance: Record<string, Record<string, { amount: string }>>;
  assetsInfo: Record<
    string,
    {
      type: 'native' | 'erc20';
      symbol: string;
      name: string;
      decimals: number;
    }
  >;
}

/**
 * Builds the `AssetsController.handleAssetsUpdate` merge payload from a
 * real-time `AccountActivityService:balanceUpdated` websocket push.
 *
 * Raw on-chain amounts (hex like `0x26f0e5` or a decimal minimal-unit string)
 * are converted to the human-readable decimal form stored in `assetsBalance`,
 * mirroring the controller's own `BackendWebsocketDataSource`. Updates missing
 * an asset id, decimals, or amount are skipped.
 *
 * @param payload - The balance push payload.
 * @param accountId - The resolved internal account id for `payload.address`.
 * @returns The merge payload, or `null` when there are no applicable updates.
 */
export function buildAssetsBalanceUpdateFromPush(
  payload: BalanceUpdatedPushPayload,
  accountId: string,
): AssetsBalanceMergeUpdate | null {
  const { updates } = payload;
  if (!Array.isArray(updates)) {
    return null;
  }

  const assetsBalance: AssetsBalanceMergeUpdate['assetsBalance'] = {
    [accountId]: {},
  };
  const assetsInfo: AssetsBalanceMergeUpdate['assetsInfo'] = {};

  for (const update of updates) {
    const assetId = update.asset?.type;
    const decimals = update.asset?.decimals;
    const rawAmount = update.postBalance?.amount;
    // Strict guards: the payload is untyped at runtime, so `null`, `NaN`,
    // negative or fractional decimals, and non-string amounts can all reach
    // here despite the declared types.
    if (
      !assetId ||
      typeof decimals !== 'number' ||
      !Number.isInteger(decimals) ||
      decimals < 0 ||
      typeof rawAmount !== 'string'
    ) {
      continue;
    }

    let amount: string;
    try {
      amount = fromTokenMinimalUnitString(rawAmount, decimals);
    } catch {
      // A single malformed amount must not abort the whole push; skip this
      // row so the remaining valid balances still merge.
      continue;
    }

    assetsBalance[accountId][assetId] = { amount };
    const isNative = assetId.includes('/slip44:');
    const unit = update.asset?.unit ?? '';
    assetsInfo[assetId] = {
      type: isNative ? 'native' : 'erc20',
      symbol: unit,
      name: unit,
      decimals,
    };
  }

  if (Object.keys(assetsBalance[accountId]).length === 0) {
    return null;
  }

  return { updateMode: 'merge', assetsBalance, assetsInfo };
}
