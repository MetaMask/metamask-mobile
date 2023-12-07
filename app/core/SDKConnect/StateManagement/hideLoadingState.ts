import Routes from '../../../constants/navigation/Routes';
import SDKConnect from '../SDKConnect';

async function hideLoadingState({ instance }: { instance: SDKConnect }) {
  instance.state.sdkLoadingState = {};
  const currentRoute = instance.state.navigation?.getCurrentRoute()?.name;
  if (
    currentRoute === Routes.SHEET.SDK_LOADING &&
    instance.state.navigation?.canGoBack()
  ) {
    instance.state.navigation?.goBack();
  }
}

export default hideLoadingState;
