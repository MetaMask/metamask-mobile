import {
  isMoneyDepositAsset,
  type MoneyDepositAsset,
} from '../../../Money/selectors/depositTokens';
import type { EarnAsset } from '../../types/earnAssets';

/**
 * Extracts Money deposit assets from the shared Earn catalogue.
 *
 * The catalogue owns membership, deposit readiness, and ordering.
 * Untracked assets and assets without an available Money experience are
 * excluded.
 *
 * @param assets - Earn catalogue assets.
 * @returns Tracked EVM assets eligible for Money deposits, in catalogue order.
 */
export const deriveMoneyDepositAssets = (
  assets: readonly EarnAsset[],
): MoneyDepositAsset[] =>
  assets.flatMap((earnAsset) => {
    if (
      earnAsset.wallet.status !== 'tracked' ||
      !earnAsset.experiences.some(
        ({ depositReadiness, type }) =>
          type === 'MONEY_ACCOUNT_DEPOSIT' &&
          depositReadiness.status === 'ready',
      ) ||
      !isMoneyDepositAsset(earnAsset.wallet.asset)
    ) {
      return [];
    }

    return [earnAsset.wallet.asset];
  });
