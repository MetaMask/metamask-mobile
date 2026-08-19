import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { ARBITRUM_MAINNET_CAIP_CHAIN_ID } from '@metamask/perps-controller';
import { USDC_ARBITRUM_MAINNET_ADDRESS } from '@metamask/perps-controller/constants/hyperLiquidConfig';
import type { CaipChainId } from '@metamask/utils';
import Routes from '../../../../constants/navigation/Routes';
import { mapPerpsTransaction } from '../../../../util/activity-adapters';
import { getActivityDetailsRoute } from '../../../Views/ActivityList/getActivityDetailsRoute';
import type { PerpsTransaction } from '../types/transactionHistory';

/**
 * HyperLiquid settles on Arbitrum; same chain/collateral ids as
 * `usePerpsActivityItems` so a fill from Perps home/TDP resolves the same
 * Activity row as the unified list.
 */
const PERPS_ACTIVITY_CHAIN_ID = ARBITRUM_MAINNET_CAIP_CHAIN_ID as CaipChainId;
const PERPS_COLLATERAL_ASSET_ID = `${PERPS_ACTIVITY_CHAIN_ID}/erc20:${USDC_ARBITRUM_MAINNET_ADDRESS.toLowerCase()}`;

/**
 * Opens Activity details for a mapped Perps history row. Falls back to the
 * legacy Perps transaction screens when the row cannot be mapped (open orders,
 * unrecognized trades).
 */
export function navigateToPerpsTransactionDetails(
  navigation: Pick<NavigationProp<ParamListBase>, 'navigate'>,
  transaction: PerpsTransaction,
): void {
  const item = mapPerpsTransaction({
    transaction,
    chainId: PERPS_ACTIVITY_CHAIN_ID,
    collateralAssetId: PERPS_COLLATERAL_ASSET_ID,
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
