import Routes from '../../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../../util/navigation/navUtils';

export const createTokensBottomSheetNavDetails = createNavigationDetails(
  Routes.MODAL.ROOT_MODAL_FLOW,
  Routes.SHEET.TOKEN_SORT,
);

export const createTokenBottomSheetFilterNavDetails = createNavigationDetails(
  Routes.MODAL.ROOT_MODAL_FLOW,
  Routes.SHEET.TOKEN_FILTER,
);

export { TokenSortBottomSheet } from './TokenSortBottomSheet';
export { TokenFilterBottomSheet } from './TokenFilterBottomSheet';
