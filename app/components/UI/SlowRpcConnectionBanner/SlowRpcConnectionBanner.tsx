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
import Spinner, { SpinnerSize } from '../AnimatedSpinner';
import { useNetworkConnectionBanners } from '../../hooks/useNetworkConnectionBanners';
import { strings } from '../../../../locales/i18n';

/**
 * Slow RPC Connection Banner
 *
 * Shows when any network takes more than 5 seconds to initialize.
 */
const SlowRpcConnectionBanner: React.FC = () => {
  const { visible, currentNetwork, editRpc } = useNetworkConnectionBanners();

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
          onPress={editRpc}
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
