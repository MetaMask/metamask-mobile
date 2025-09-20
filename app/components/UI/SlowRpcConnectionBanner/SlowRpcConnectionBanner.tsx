import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  Button,
  BoxFlexDirection,
  BoxAlignItems,
  BoxFlexWrap,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Hex, hexToNumber } from '@metamask/utils';
import { strings } from '../../../../locales/i18n';
import { RootState } from '../../../reducers';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import Routes from '../../../constants/navigation/Routes';
import Spinner, { SpinnerSize } from '../AnimatedSpinner';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { toggleSlowRpcConnectionBanner } from '../../../actions/modals';

/**
 * Slow RPC Connection Banner
 *
 * Shows when any network takes more than 5 seconds to initialize.
 */
const SlowRpcConnectionBanner: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();
  const visible = useSelector(
    (state: RootState) => state.modals.slowRpcConnectionBannerVisible,
  );
  const chainId = useSelector(
    (state: RootState) => state.modals.slowRpcConnectionChainId,
  ) as Hex;
  const networkConfigurationByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const currentNetwork = networkConfigurationByChainId[chainId];

  const handleEditRpc = () => {
    const defaultEndpointIndex = currentNetwork.defaultRpcEndpointIndex || 0;
    const rpcUrl =
      currentNetwork.rpcEndpoints[defaultEndpointIndex]?.url ||
      currentNetwork.rpcEndpoints[0]?.url;

    // Tracking the event
    navigation.navigate(Routes.EDIT_NETWORK, {
      network: rpcUrl,
      shouldNetworkSwitchPopToWallet: false,
      shouldShowPopularNetworks: false,
    });

    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SLOW_RPC_MONITORING_BANNER_EDIT_RPC_CLICKED,
      )
        .addProperties({
          chain_id_caip: `eip155:${hexToNumber(chainId)}`,
        })
        .build(),
    );

    dispatch(toggleSlowRpcConnectionBanner({ visible: false, chainId }));
  };

  if (!visible || !currentNetwork) {
    return null;
  }

  return (
    <Box twClassName="bg-warning-muted border-t border-warning-muted px-4 py-3">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        flexWrap={BoxFlexWrap.Wrap}
        gap={2}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="flex-1 basis-full"
          gap={2}
        >
          <Spinner size={SpinnerSize.SM} />
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-default flex-1"
            numberOfLines={1}
          >
            {strings('slow_rpc_connection_banner.still_connecting_network', {
              networkName: currentNetwork.name,
            })}
          </Text>
        </Box>

        <Button
          variant={ButtonVariant.Tertiary}
          onPress={handleEditRpc}
          disabled={false}
          twClassName="shrink-0"
        >
          {strings('slow_rpc_connection_banner.edit_rpc')}
        </Button>
      </Box>
    </Box>
  );
};

export default SlowRpcConnectionBanner;
