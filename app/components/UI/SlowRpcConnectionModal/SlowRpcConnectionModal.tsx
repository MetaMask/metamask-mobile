import React, { useCallback } from 'react';
import Modal from 'react-native-modal';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  Button,
  ButtonVariant,
  ButtonSize,
  TextVariant,
  IconName,
  Icon,
  IconSize,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import { RootState } from '../../../reducers';
import { toggleSlowRpcConnectionModal } from '../../../actions/modals';
import {
  selectChainId,
  selectNetworkConfigurationByChainId,
} from '../../../selectors/networkController';

interface SlowRpcConnectionModalProps {
  onSwitchNetwork?: () => void;
}

/**
 * Slow RPC Connection Modal
 *
 * Shows when any network (custom or built-in) takes too long to initialize.
 * Monitors ALL networks for slow initialization (>5 seconds).
 */
const SlowRpcConnectionModal: React.FC<SlowRpcConnectionModalProps> = ({
  onSwitchNetwork,
}) => {
  const tw = useTailwind();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const visible = useSelector(
    (state: RootState) => state.modals.slowRpcConnectionModalVisible,
  );
  const chainId = useSelector(selectChainId);
  const currentNetwork = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, chainId),
  );

  const handleClose = useCallback(() => {
    dispatch(toggleSlowRpcConnectionModal({ visible: false }));
  }, [dispatch]);

  const handleRetry = useCallback(async () => {
    try {
      // Force refresh the network connection
      const { NetworkController } = Engine.context;
      const networkConfig = currentNetwork as {
        rpcEndpoints?: { networkClientId?: string }[];
        defaultRpcEndpointIndex?: number;
      };
      const networkClientId =
        networkConfig?.rpcEndpoints?.[
          networkConfig?.defaultRpcEndpointIndex ?? 0
        ]?.networkClientId;

      if (networkClientId) {
        // Trigger a network refresh by switching to the same network
        await NetworkController.setActiveNetwork(networkClientId);
      }

      // Close modal after successful retry
      handleClose();
    } catch (error) {
      console.error('Failed to retry network connection:', error);
    }
  }, [currentNetwork, handleClose]);

  const handleSwitchNetwork = useCallback(() => {
    handleClose();

    if (onSwitchNetwork) {
      onSwitchNetwork();
    } else {
      // Navigate to network selector
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.NETWORK_SELECTOR,
      });
    }
  }, [handleClose, navigation, onSwitchNetwork]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={handleClose}
      onBackButtonPress={handleClose}
      onSwipeComplete={handleClose}
      swipeDirection="down"
      propagateSwipe
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.4}
      style={tw.style('m-0 justify-end')}
    >
      <Box twClassName="bg-default rounded-t-3xl px-6 pb-6 pt-4">
        {/* Drag handle */}
        <Box
          twClassName="w-12 h-1 bg-muted rounded-full mb-6"
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          style={tw.style('self-center')}
        />

        {/* Warning Icon - Exclamation mark */}
        <Box alignItems={BoxAlignItems.Center} twClassName="mb-4">
          <Icon name={IconName.Danger} size={IconSize.Xl} />
        </Box>

        {/* Title */}
        <Text variant={TextVariant.HeadingMd} twClassName="text-center mb-4">
          {strings(
            'custom_rpc_connection_modal.network_connection_failed_title',
          )}
        </Text>

        {/* Description */}
        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-center text-alternative mb-6"
        >
          {strings(
            'custom_rpc_connection_modal.network_unavailable_description',
          )}
        </Text>

        {/* Buttons */}
        <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-3">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleRetry}
            disabled={false}
            style={tw.style('w-full')}
          >
            {strings('custom_rpc_connection_modal.try_again')}
          </Button>

          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={handleSwitchNetwork}
            disabled={false}
            style={tw.style('w-full')}
          >
            {strings('custom_rpc_connection_modal.switch_network')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default SlowRpcConnectionModal;
