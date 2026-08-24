import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import {
  getCaipChainId,
  USDC_ARBITRUM_MAINNET_ADDRESS,
  USDC_ARBITRUM_TESTNET_ADDRESS,
} from '@metamask/perps-controller/constants/hyperLiquidConfig';
import type { CaipChainId } from '@metamask/utils';
import Routes from '../../../../constants/navigation/Routes';
import { mapPerpsTransaction } from '../../../../util/activity-adapters';
import { getActivityDetailsRoute } from '../../../Views/ActivityList/getActivityDetailsRoute';
import type { PerpsTransaction } from '../types/transactionHistory';

function getPerpsActivityMappingIds(isTestnet: boolean): {
  chainId: CaipChainId;
  collateralAssetId: string;
} {
  const chainId = getCaipChainId(isTestnet) as CaipChainId;
  const usdcAddress = (
    isTestnet ? USDC_ARBITRUM_TESTNET_ADDRESS : USDC_ARBITRUM_MAINNET_ADDRESS
  ).toLowerCase();
  return {
    chainId,
    collateralAssetId: `${chainId}/erc20:${usdcAddress}`,
  };
}

/**
 * Opens Activity details for a mapped Perps history row. Callers pass the active
 * Perps network (`usePerpsNetwork`) so this module stays store-free. Settlement
 * chain and collateral follow HyperLiquid mainnet vs testnet. Falls back to the
 * legacy Perps transaction screens when the row cannot be mapped (open orders,
 * unrecognized trades).
 */
export function navigateToPerpsTransactionDetails(
  navigation: Pick<NavigationProp<ParamListBase>, 'navigate'>,
  transaction: PerpsTransaction,
  isTestnet: boolean,
): void {
  const { chainId, collateralAssetId } = getPerpsActivityMappingIds(isTestnet);
  const item = mapPerpsTransaction({
    transaction,
    chainId,
    collateralAssetId,
  });
  const detailsRoute = item ? getActivityDetailsRoute(item) : null;
  if (detailsRoute) {
    navigation.navigate(Routes.ACTIVITY_DETAILS, detailsRoute);
    return;
  }

  if (transaction.type === 'trade') {
    navigation.navigate(Routes.PERPS.POSITION_TRANSACTION, { transaction });
    return;
  }
  if (transaction.type === 'order') {
    navigation.navigate(Routes.PERPS.ORDER_TRANSACTION, { transaction });
    return;
  }
  if (transaction.type === 'funding') {
    navigation.navigate(Routes.PERPS.FUNDING_TRANSACTION, { transaction });
  }
}
