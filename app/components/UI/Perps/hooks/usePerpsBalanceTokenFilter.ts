import { TransactionType } from '@metamask/transaction-controller';
import { BigNumber } from 'bignumber.js';
import perpsPayTokenIcon from 'images/perps-pay-token-icon.png';
import { useCallback } from 'react';
import { Image } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import useFiatFormatter from '../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import {
  AssetType,
  HighlightedItem,
  type TokenListItem,
} from '../../../Views/confirmations/types/token';
import { hasTransactionType } from '../../../Views/confirmations/utils/transaction';
import { selectPerpsPayWithAnyTokenAllowlistAssets } from '../selectors/featureFlags';
import { selectPerpsAccountState } from '../selectors/perpsController';
import { useIsPerpsBalanceSelected } from './useIsPerpsBalanceSelected';
import { usePerpsPaymentToken } from './usePerpsPaymentToken';
import Routes from '../../../../constants/navigation/Routes';
import { usePerpsTrading } from './usePerpsTrading';
import { useNavigation } from '@react-navigation/native';
import useApprovalRequest from '../../../Views/confirmations/hooks/useApprovalRequest';

/** URI for the perps balance token icon, shared with PerpsPayRow and pay-with modal. */
const resolvedPerpsIcon = Image.resolveAssetSource(perpsPayTokenIcon);
export const PERPS_BALANCE_ICON_URI = resolvedPerpsIcon?.uri ?? '';

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
) => TokenListItem[] {
  const transactionMeta = useTransactionMetadataRequest();
  const isPerpsBalanceSelected = useIsPerpsBalanceSelected();
  const perpsAccount = useSelector(selectPerpsAccountState);
  const allowListAssets = useSelector(
    selectPerpsPayWithAnyTokenAllowlistAssets,
  );
  const formatFiat = useFiatFormatter({ currency: 'usd' });

  const { depositWithConfirmation } = usePerpsTrading();

  const isPerpsDepositAndOrder = hasTransactionType(transactionMeta, [
    TransactionType.perpsDepositAndOrder,
  ]);

  const { onReject: handleReject } = useApprovalRequest();

  const navigation = useNavigation();

  const handlePerpsDepositPress = useCallback(() => {
    handleReject();
    depositWithConfirmation()
      .then(() => {
        navigation.navigate(
          Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          {
            showPerpsHeader: true,
          },
        );
      })
      .catch(() => {
        // Deposit flow handles errors (e.g. user rejection).
      });
  }, [navigation, depositWithConfirmation, handleReject]);

  const { onPaymentTokenChange: onPerpsPaymentTokenChange } =
    usePerpsPaymentToken();

  const filterAllowedTokens = useCallback(
    (tokens: AssetType[]): TokenListItem[] => {
      if (
        !hasTransactionType(transactionMeta, [
          TransactionType.perpsDepositAndOrder,
        ])
      ) {
        return tokens;
      }

      const availableBalance = perpsAccount?.availableBalance || '0';
      const balanceInSelectedCurrency = formatFiat(
        new BigNumber(availableBalance),
      );

      const perpsBalanceName = strings('perps.adjust_margin.perps_balance');

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

      if (!isPerpsDepositAndOrder) {
        return mappedTokens;
      }

      const highlightedAction: HighlightedItem = {
        position: 'outside_of_asset_list',
        icon: PERPS_BALANCE_ICON_URI,
        name: perpsBalanceName,
        name_description: balanceInSelectedCurrency,
        fiat: balanceInSelectedCurrency,
        fiat_description: balanceInSelectedCurrency,
        isSelected: isPerpsBalanceSelected,
        action: () => onPerpsPaymentTokenChange(null),
        actions: [
          {
            buttonLabel: strings('perps.add_funds'),
            onPress: handlePerpsDepositPress,
          },
        ],
      };

      return [highlightedAction, ...mappedTokens];
    },
    [
      handlePerpsDepositPress,
      isPerpsDepositAndOrder,
      allowListAssets,
      formatFiat,
      onPerpsPaymentTokenChange,
      isPerpsBalanceSelected,
      perpsAccount?.availableBalance,
      transactionMeta,
    ],
  );

  return filterAllowedTokens;
}
