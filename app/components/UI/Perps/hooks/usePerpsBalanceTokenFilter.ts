import { TransactionType } from '@metamask/transaction-controller';
import { BigNumber } from 'bignumber.js';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import useFiatFormatter from '../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { AssetType } from '../../../Views/confirmations/types/token';
import { hasTransactionType } from '../../../Views/confirmations/utils/transaction';
import {
  PERPS_BALANCE_CHAIN_ID,
  PERPS_BALANCE_PLACEHOLDER_ADDRESS,
  PERPS_CONSTANTS,
} from '../constants/perpsConfig';
import { USDC_TOKEN_ICON_URL } from '../constants/hyperLiquidConfig';
import { selectPerpsAccountState } from '../selectors/perpsController';
import { useIsPerpsBalanceSelected } from './useIsPerpsBalanceSelected';

/**
 * Returns a filter that prepends a synthetic "Perps balance" token to the list
 * when the transaction type is perpsDepositAndOrder. The token shows the perps
 * account balance, USDC icon, and label "Perps balance".
 *
 * Uses PerpsController state (Redux) so it works in any screen, including
 * PayWithModal and confirmations where PerpsStreamProvider is not mounted.
 */
export function usePerpsBalanceTokenFilter(): (
  tokens: AssetType[],
) => AssetType[] {
  const transactionMeta = useTransactionMetadataRequest();
  const isPerpsBalanceSelected = useIsPerpsBalanceSelected();
  const perpsAccount = useSelector(selectPerpsAccountState);
  const formatFiat = useFiatFormatter({ currency: 'usd' });

  const filterAllowedTokens = useCallback(
    (tokens: AssetType[]): AssetType[] => {
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
        symbol: 'USD',
        balance: availableBalance,
        balanceInSelectedCurrency,
        image: USDC_TOKEN_ICON_URL,
        logo: USDC_TOKEN_ICON_URL,
        decimals: 2,
        isETH: false,
        isNative: false,
        isSelected: isPerpsBalanceSelected,
        description: PERPS_CONSTANTS.PerpsBalanceTokenDescription,
      };

      const mappedTokens = tokens.map((token) => ({
        ...token,
        isSelected:
          token.isSelected && isPerpsBalanceSelected ? false : token.isSelected,
      }));

      return [perpsBalanceToken, ...mappedTokens];
    },
    [
      transactionMeta,
      isPerpsBalanceSelected,
      perpsAccount?.availableBalance,
      formatFiat,
    ],
  );

  return filterAllowedTokens;
}
