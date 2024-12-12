import Routes from '../../../constants/navigation/Routes';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import NavigationService from '../../NavigationService';

async function hideLoadingState({ instance }: { instance: SDKConnect }) {
  instance.state.sdkLoadingState = {};
  const currentRoute = NavigationService.navigation?.getCurrentRoute()?.name;
  DevLogger.log(`SDKConnect::hideLoadingState currentRoute=${currentRoute}`);
  if (
    currentRoute === Routes.SHEET.SDK_LOADING &&
    NavigationService.navigation?.canGoBack()
  ) {
    NavigationService.navigation?.goBack();
  } else {
    DevLogger.log(
      `SDKConnect::hideLoadingState - SKIP - currentRoute=${currentRoute}`,
    );
  }
}

export default hideLoadingState;
