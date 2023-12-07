import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import { KeyringController } from '@metamask/keyring-controller';
import { waitForKeychainUnlocked } from '../utils/wait.util';
import Engine from '../../Engine';
import Routes from '../../../constants/navigation/Routes';

async function updateSDKLoadingState({
  channelId,
  loading,
  instance,
}: {
  channelId: string;
  loading: boolean;
  instance: SDKConnect;
}) {
  if (loading === true) {
    instance.state.sdkLoadingState[channelId] = true;
  } else {
    delete instance.state.sdkLoadingState[channelId];
  }

  const loadingSessionsLen = Object.keys(instance.state.sdkLoadingState).length;
  DevLogger.log(
    `SDKConnect::updateSDKLoadingState channel=${channelId} loading=${loading} loadingSessions=${loadingSessionsLen}`,
  );
  if (loadingSessionsLen > 0) {
    // Prevent loading state from showing if keychain is locked.
    const keyringController = (
      Engine.context as { KeyringController: KeyringController }
    ).KeyringController;

    await waitForKeychainUnlocked({
      keyringController,
      context: 'updateSDKLoadingState',
    });

    instance.state.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SDK_LOADING,
    });
  } else {
    await instance.hideLoadingState();
  }
}

export default updateSDKLoadingState;
