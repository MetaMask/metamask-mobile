import Routes from '../../../constants/navigation/Routes';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';

async function hideLoadingState({ instance }: { instance: SDKConnect }) {
  instance.state.sdkLoadingState = {};
  const currentRoute = instance.state.navigation?.getCurrentRoute()?.name;
  DevLogger.log(`SDKConnect::hideLoadingState currentRoute=${currentRoute}`);
  if (
    currentRoute === Routes.SHEET.SDK_LOADING &&
    instance.state.navigation?.canGoBack()
  ) {
    instance.state.navigation?.goBack();
  } else {
    DevLogger.log(
      `SDKConnect::hideLoadingState - SKIP - currentRoute=${currentRoute}`,
    );
  }
}

export default hideLoadingState;
