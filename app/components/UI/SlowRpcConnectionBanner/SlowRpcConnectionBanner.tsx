import React from 'react';
import { ActivityIndicator } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  IconName,
  Icon,
  IconSize,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { RootState } from '../../../reducers';
import {
  selectChainId,
  selectNetworkConfigurationByChainId,
} from '../../../selectors/networkController';

/**
 * Slow RPC Connection Banner
 *
 * Shows when any network takes more than 5 seconds to initialize.
 * This is a non-blocking indicator that appears before the modal (30 seconds).
 */
const SlowRpcConnectionBanner: React.FC = () => {
  const tw = useTailwind();

  const visible = useSelector(
    (state: RootState) => state.modals.slowRpcConnectionBannerVisible,
  );
  const chainId = useSelector(selectChainId);
  const currentNetwork = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, chainId),
  );

  if (!visible) {
    return null;
  }

  const networkName = currentNetwork?.name;

  return (
    <Box
      twClassName="bg-warning-muted border-t border-warning-muted px-4 py-3"
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
    >
      <ActivityIndicator
        size="small"
        color={tw.color('text-warning')}
        style={tw.style('mr-3')}
      />

      <Box twClassName="flex-1">
        <Text variant={TextVariant.BodyMd} twClassName="text-default">
          {strings('slow_rpc_connection_banner.loading_network', {
            networkName,
          })}
        </Text>
      </Box>

      <Icon name={IconName.Info} size={IconSize.Sm} />
    </Box>
  );
};

export default SlowRpcConnectionBanner;
