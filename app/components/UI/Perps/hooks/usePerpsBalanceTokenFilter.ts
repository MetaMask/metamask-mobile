import { TransactionType } from '@metamask/transaction-controller';
import perpsPayTokenIcon from 'images/perps-pay-token-icon.png';
import { useCallback } from 'react';
import { Image } from 'react-native';
import { useSelector } from 'react-redux';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import {
  AssetType,
  type TokenListItem,
} from '../../../Views/confirmations/types/token';
import { hasTransactionType } from '../../../Views/confirmations/utils/transaction';
import { selectPerpsPayWithAnyTokenAllowlistAssets } from '../selectors/featureFlags';
import { useIsPerpsBalanceSelected } from './useIsPerpsBalanceSelected';

/** URI for the perps balance token icon, shared with PerpsPayRow and pay-with modal. */
const resolvedPerpsIcon = Image.resolveAssetSource(perpsPayTokenIcon);
export const PERPS_BALANCE_ICON_URI = resolvedPerpsIcon?.uri ?? '';

/**
 * Returns a filter that applies allowlist filtering and deselects other tokens
 * when the Perps balance is selected for perpsDepositAndOrder transactions.
 *
 * Uses PerpsController state (Redux) so it works in any screen, including
 * PayWithModal and confirmations where PerpsStreamProvider is not mounted.
 */
export function usePerpsBalanceTokenFilter(): (
  tokens: AssetType[],
) => TokenListItem[] {
  const transactionMeta = useTransactionMetadataRequest();
  const isPerpsBalanceSelected = useIsPerpsBalanceSelected();
  const allowListAssets = useSelector(
    selectPerpsPayWithAnyTokenAllowlistAssets,
  );

  const filterAllowedTokens = useCallback(
    (tokens: AssetType[]): TokenListItem[] => {
      if (
        !hasTransactionType(transactionMeta, [
          TransactionType.perpsDepositAndOrder,
        ])
      ) {
        return tokens;
      }

      let mappedTokens = tokens.map((token) => ({
        ...token,
        isSelected:
          token.isSelected && isPerpsBalanceSelected ? false : token.isSelected,
      }));

      if ((allowListAssets?.length ?? 0) > 0) {
        const allowSet = new Set(allowListAssets);
        mappedTokens = mappedTokens.filter((token) => {
          const key = `${token.chainId}.${(token.address ?? '').toLowerCase()}`;
          return allowSet.has(key);
        });
      }

      return mappedTokens;
    },
    [allowListAssets, isPerpsBalanceSelected, transactionMeta],
  );

  return filterAllowedTokens;
}
