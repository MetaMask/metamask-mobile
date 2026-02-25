import { TransactionType } from '@metamask/transaction-controller';
import { BigNumber } from 'bignumber.js';
import { useCallback } from 'react';
import { Image } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import useFiatFormatter from '../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import {
  AssetType,
  HighlightedAssetListItem,
  type HighlightedActionListItem,
  type TokenListItem,
} from '../../../Views/confirmations/types/token';
import { hasTransactionType } from '../../../Views/confirmations/utils/transaction';
import perpsPayTokenIcon from 'images/perps-pay-token-icon.png';
import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import {
  PERPS_BALANCE_CHAIN_ID,
  PERPS_BALANCE_PLACEHOLDER_ADDRESS,
} from '../constants/perpsConfig';
import { selectPerpsPayWithAnyTokenAllowlistAssets } from '../selectors/featureFlags';
import { selectPerpsAccountState } from '../selectors/perpsController';
import { useIsPerpsBalanceSelected } from './useIsPerpsBalanceSelected';

/** URI for the perps balance token icon, shared with PerpsPayRow and pay-with modal. */
const resolvedPerpsIcon = Image.resolveAssetSource(perpsPayTokenIcon);
export const PERPS_BALANCE_ICON_URI = resolvedPerpsIcon?.uri ?? '';

export interface UsePerpsBalanceTokenFilterOptions {
  /** When provided, a highlighted action row with an "Add" button is prepended for depositing into perps balance. */
  onDepositPress?: () => void;
}

/**
 * Returns a filter that prepends a synthetic "Perps balance" token to the list
 * when the transaction type is perpsDepositAndOrder. The token shows the perps
 * account balance, USDC icon, and label "Perps balance".
 *
 * When `onDepositPress` is provided, a highlighted action row with an "Add" button
 * is prepended above the perps balance token so the user can open the deposit flow.
 *
 * Uses PerpsController state (Redux) so it works in any screen, including
 * PayWithModal and confirmations where PerpsStreamProvider is not mounted.
 */
export function usePerpsBalanceTokenFilter(
  options?: UsePerpsBalanceTokenFilterOptions,
): (tokens: AssetType[]) => TokenListItem[] {
  const transactionMeta = useTransactionMetadataRequest();
  const isPerpsBalanceSelected = useIsPerpsBalanceSelected();
  const perpsAccount = useSelector(selectPerpsAccountState);
  const allowListAssets = useSelector(
    selectPerpsPayWithAnyTokenAllowlistAssets,
  );
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const onDepositPress = options?.onDepositPress;

  const filterAllowedTokens = useCallback(
    (tokens: AssetType[]): TokenListItem[] => {
      if (
        !hasTransactionType(transactionMeta, [
          TransactionType.perpsDepositAndOrder,
        ])
      ) {
        return tokens;
      }

      const chainId = PERPS_BALANCE_CHAIN_ID;

      const availableBalance = perpsAccount?.availableBalance || '0';
      const balanceInSelectedCurrency = formatFiat(
        new BigNumber(availableBalance),
      );

      const perpsBalanceName = strings('perps.adjust_margin.perps_balance');

      const perpsBalanceToken: AssetType = {
        address: PERPS_BALANCE_PLACEHOLDER_ADDRESS,
        chainId,
        tokenId: PERPS_BALANCE_PLACEHOLDER_ADDRESS,
        name: perpsBalanceName,
        symbol: PERPS_CONSTANTS.PerpsBalanceTokenSymbol,
        balance: availableBalance,
        balanceInSelectedCurrency,
        image: PERPS_BALANCE_ICON_URI,
        logo: PERPS_BALANCE_ICON_URI,
        decimals: 2,
        isETH: false,
        isNative: false,
        isSelected: isPerpsBalanceSelected,
        description: PERPS_CONSTANTS.PerpsBalanceTokenDescription,
      };

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

      const tokenList: TokenListItem[] = [...mappedTokens];

      if (onDepositPress) {
        const highlightedAction: HighlightedActionListItem = {
          type: 'highlighted_action',
          icon: PERPS_BALANCE_ICON_URI,
          name: perpsBalanceName,
          name_description: balanceInSelectedCurrency,
          actions: [
            {
              buttonLabel: strings('perps.add_funds'),
              onPress: onDepositPress,
            },
          ],
        };
        // const highlightedAction2: HighlightedAssetListItem = {
        //   type: 'highlighted_asset',
        //   icon: PERPS_BALANCE_ICON_URI,
        //   name: perpsBalanceName,
        //   name_description: balanceInSelectedCurrency,
        //   action: onDepositPress,
        //   fiat: balanceInSelectedCurrency,
        //   fiat_description: balanceInSelectedCurrency,
        // };
        return [highlightedAction, ...tokenList];
      }

      return tokenList;
    },
    [
      transactionMeta,
      isPerpsBalanceSelected,
      perpsAccount?.availableBalance,
      allowListAssets,
      formatFiat,
      onDepositPress,
    ],
  );

  return filterAllowedTokens;
}
