import { SuccessErrorSheetParams } from './interface';
import Routes from '../../../constants/navigation/Routes';
import { AppNavigationProp } from '../../../core/NavigationService/types';

export const navigateToSuccessErrorSheet = (
  navigation: AppNavigationProp,
  params: SuccessErrorSheetParams,
) => {
  navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
    screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
    params: {
      ...params,
    },
  });
};

export const navigateToSuccessErrorSheetPromise = async (
  navigation: AppNavigationProp,
  params: SuccessErrorSheetParams,
) =>
  new Promise<void>((resolve) => {
    navigateToSuccessErrorSheet(navigation, {
      ...params,
      onPrimaryButtonPress: () => {
        params.onPrimaryButtonPress?.();
        resolve();
      },
      onSecondaryButtonPress: () => {
        params.onSecondaryButtonPress?.();
        resolve();
      },
      onClose: () => {
        params.onClose?.();
        resolve();
      },
    });
  });
