import { toHex } from '@metamask/controller-utils';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import useFiatFormatter from '../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { useTransactionPayToken } from '../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { AssetType } from '../../../Views/confirmations/types/token';
import { hasTransactionType } from '../../../Views/confirmations/utils/transaction';
import {
  HYPERLIQUID_MAINNET_CHAIN_ID,
  USDC_SYMBOL,
  USDC_TOKEN_ICON_URL
} from '../constants/hyperLiquidConfig';
import { selectPerpsAccountState } from '../selectors/perpsController';

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
  const { payToken } = useTransactionPayToken();
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

      const chainId = CHAIN_IDS.MAINNET;

      const availableBalance = perpsAccount?.availableBalance || '0';
      const balanceInSelectedCurrency = formatFiat(
        new BigNumber(availableBalance),
      );

      const perpsBalanceName = strings('perps.adjust_margin.perps_balance');

      const perpsBalancePlaceholder =
        '0x0000000000000000000000000000000000000000' as Hex;
      const isPerpsBalanceSelected =
        payToken?.address?.toLowerCase() ===
        perpsBalancePlaceholder.toLowerCase();

      const perpsBalanceToken: AssetType = {
        address: perpsBalancePlaceholder,
        chainId,
        tokenId: perpsBalancePlaceholder,
        name: perpsBalanceName,
        symbol: 'Perps Balance',
        balance: availableBalance,
        balanceInSelectedCurrency,
        image: USDC_TOKEN_ICON_URL,
        logo: USDC_TOKEN_ICON_URL,
        decimals: 2,
        isETH: false,
        isNative: false,
        isSelected: isPerpsBalanceSelected,
      };

      return [perpsBalanceToken, ...tokens];
    },
    [
      transactionMeta,
      payToken?.address,
      perpsAccount?.availableBalance,
      formatFiat,
    ],
  );

  return filterAllowedTokens;
}
