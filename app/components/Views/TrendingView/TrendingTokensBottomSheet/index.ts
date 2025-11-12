import Routes from '../../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../../util/navigation/navUtils';

export const createTrendingTokenTimeBottomSheetNavDetails =
  createNavigationDetails(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.TRENDING_TOKEN_TIME,
  );

export const createTrendingTokenNetworkBottomSheetNavDetails =
  createNavigationDetails(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.TRENDING_TOKEN_NETWORK,
  );

export {
  TrendingTokenTimeBottomSheet,
  TimeOption,
  mapSortByToTimeOption,
} from './TrendingTokenTimeBottomSheet';

export {
  TrendingTokenNetworkBottomSheet,
  NetworkOption,
} from './TrendingTokenNetworkBottomSheet';
