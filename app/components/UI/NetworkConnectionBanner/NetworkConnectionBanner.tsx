import React from 'react';
import { View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../component-library/components/Banners/Banner';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import Spinner, { SpinnerSize } from '../AnimatedSpinner';
import { useNetworkConnectionBanner } from '../../hooks/useNetworkConnectionBanner';
import { strings } from '../../../../locales/i18n';

/**
 * Network Connection Banner
 *
 * Shows when any network takes more than 5 seconds to initialize or is not available.
 */
const NetworkConnectionBanner: React.FC = () => {
  const { networkConnectionBannerState, updateRpc } =
    useNetworkConnectionBanner();
  const tw = useTailwind();

  if (!networkConnectionBannerState.visible) {
    return null;
  }

  return (
    <View style={tw.style('px-4', 'mt-4')}>
      <Banner
        variant={BannerVariant.Alert}
        severity={BannerAlertSeverity.Warning}
        startAccessory={
          networkConnectionBannerState.status === 'slow' ? (
            <Spinner size={SpinnerSize.SM} />
          ) : (
            <Icon name={IconName.Danger} size={IconSize.Md} />
          )
        }
        title={strings(
          networkConnectionBannerState.status === 'slow'
            ? 'network_connection_banner.still_connecting_network'
            : 'network_connection_banner.unable_to_connect_network',
          {
            networkName: networkConnectionBannerState.networkName,
          },
        )}
        actionButtonProps={{
          variant: ButtonVariants.Link,
          label: strings('network_connection_banner.update_rpc'),
          onPress: () =>
            updateRpc(
              networkConnectionBannerState.rpcUrl,
              networkConnectionBannerState.status,
              networkConnectionBannerState.chainId,
            ),
        }}
      />
    </View>
  );
};

export default NetworkConnectionBanner;
