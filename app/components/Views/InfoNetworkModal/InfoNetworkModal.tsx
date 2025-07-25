import React, { useEffect, useRef } from 'react';
import Modal from 'react-native-modal';
import { useIsFocused } from '@react-navigation/native';
import NetworkInfo from '../../UI/NetworkInfo';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../reducers';
import { useTheme } from '../../../util/theme';
import { selectChainId } from '../../../selectors/networkController';
import {
  networkSwitched,
  onboardNetworkAction,
} from '../../../actions/onboardNetwork';
import { toggleInfoNetworkModal } from '../../../actions/modals';
import { getIsNetworkOnboarded } from '../../../util/networks';
import { useIsOnBridgeRoute } from '../../UI/Bridge/hooks/useIsOnBridgeRoute';
import { handleNetworkSwitch } from './utils';

const InfoNetworkModal = () => {
  const prevNetwork = useRef<string>();

  const isFocused = useIsFocused();
  const isOnBridgeRoute = useIsOnBridgeRoute();

  const theme = useTheme();
  const dispatch = useDispatch();
  const infoNetworkModalVisible = useSelector(
    (state: RootState) => state.modals.infoNetworkModalVisible,
  );
  const networkOnboardingState = useSelector(
    (state: RootState) => state.networkOnboarded.networkOnboardedState,
  );
  const chainId = useSelector(selectChainId);

  const onClose = () => {
    dispatch(onboardNetworkAction(chainId));

    dispatch(networkSwitched({ networkUrl: '', networkStatus: false }));

    dispatch(toggleInfoNetworkModal(false));
  };

  useEffect(() => {
    if (prevNetwork.current !== chainId && chainId) {
      if (prevNetwork.current) {
        // Network switched has occured
        // Check if network has been onboarded.
        const networkOnboarded = getIsNetworkOnboarded(
          chainId,
          networkOnboardingState,
        );
        handleNetworkSwitch(dispatch, networkOnboarded, isOnBridgeRoute);
      }
      prevNetwork.current = chainId;
    }
  }, [chainId, dispatch, networkOnboardingState, isOnBridgeRoute]);

  // If the Main screen is not focused, don't render it
  if (!isFocused) {
    return null;
  }

  return (
    <Modal
      isVisible={infoNetworkModalVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={'down'}
      propagateSwipe
      backdropColor={theme.colors.overlay.default}
      backdropOpacity={1}
    >
      <NetworkInfo onClose={onClose} />
    </Modal>
  );
};

export default InfoNetworkModal;
