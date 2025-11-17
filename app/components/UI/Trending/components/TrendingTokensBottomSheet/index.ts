import Routes from '../../../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';

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

export const createTrendingTokenPriceChangeBottomSheetNavDetails =
  createNavigationDetails(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.TRENDING_TOKEN_PRICE_CHANGE,
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

export {
  TrendingTokenPriceChangeBottomSheet,
  PriceChangeOption,
  SortDirection,
} from './TrendingTokenPriceChangeBottomSheet';
