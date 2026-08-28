import type { Asset } from '@metamask/assets-controllers';
import type { MoneyDepositAsset } from '../../../Money/selectors/depositTokens';
import type { EarnAsset } from '../../types/earnAssets';

const isMoneyDepositAsset = (asset: Asset): asset is MoneyDepositAsset =>
  'address' in asset &&
  typeof asset.address === 'string' &&
  asset.address.length > 0 &&
  typeof asset.chainId === 'string' &&
  asset.chainId.length > 0 &&
  asset.accountType?.startsWith('eip155:') === true;

/**
 * Extracts Money deposit assets from the shared Earn catalogue.
 *
 * The catalogue is the source of truth for both eligibility and ordering.
 * Discovery assets and assets without a Money deposit experience are excluded.
 */
export const deriveMoneyDepositAssets = (
  assets: readonly EarnAsset[],
): MoneyDepositAsset[] =>
  assets.flatMap((earnAsset) => {
    if (
      earnAsset.kind !== 'held' ||
      !earnAsset.experiences.some(
        ({ type }) => type === 'MONEY_ACCOUNT_DEPOSIT',
      ) ||
      !isMoneyDepositAsset(earnAsset.asset)
    ) {
      return [];
    }

    return [earnAsset.asset];
  });
