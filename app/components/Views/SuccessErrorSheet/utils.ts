import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { SuccessErrorSheetParams } from './interface';
import Routes from '../../../constants/navigation/Routes';

export const navigateToSuccessErrorSheet = (
  navigation: NavigationProp<ParamListBase>,
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
  navigation: NavigationProp<ParamListBase>,
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
