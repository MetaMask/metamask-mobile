import { InteractionManager } from 'react-native';
import { toggleInfoNetworkModal } from '../../../actions/modals';
import { AnyAction, Dispatch } from 'redux';

export const handleNetworkSwitch = (
  dispatch: Dispatch<AnyAction>,
  networkOnboarded: boolean,
  isOnBridgeRoute: boolean,
) => {
  if (!networkOnboarded && !isOnBridgeRoute) {
    InteractionManager.runAfterInteractions(() => {
      dispatch(toggleInfoNetworkModal(true));
    });
  }
};
