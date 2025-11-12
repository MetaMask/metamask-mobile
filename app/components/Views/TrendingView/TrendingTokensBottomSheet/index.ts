import Routes from '../../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../../util/navigation/navUtils';

export const createTrendingTokenTimeBottomSheetNavDetails =
  createNavigationDetails(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.TRENDING_TOKEN_TIME,
  );

export { TrendingTokenTimeBottomSheet } from './TrendingTokenTimeBottomSheet';
