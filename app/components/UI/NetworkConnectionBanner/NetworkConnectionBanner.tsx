import React from 'react';
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

  if (!networkConnectionBannerState.visible) {
    return null;
  }

  return (
    <Banner
      variant={BannerVariant.Alert}
      severity={BannerAlertSeverity.Warning}
      startAccessory={
        networkConnectionBannerState.status === 'degraded' ? (
          <Spinner size={SpinnerSize.SM} />
        ) : (
          <Icon name={IconName.Danger} size={IconSize.Md} />
        )
      }
      title={strings(
        networkConnectionBannerState.status === 'degraded'
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
  );
};

export default NetworkConnectionBanner;
