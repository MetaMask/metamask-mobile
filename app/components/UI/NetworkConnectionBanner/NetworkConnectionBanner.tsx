import React from 'react';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../component-library/components/Banners/Banner';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import Spinner, { SpinnerSize } from '../AnimatedSpinner';
import { useNetworkConnectionBanners } from '../../hooks/useNetworkConnectionBanners';
import { strings } from '../../../../locales/i18n';

/**
 * Network Connection Banner
 *
 * Shows when any network takes more than 5 seconds to initialize or is not available.
 */
const NetworkConnectionBanner: React.FC = () => {
  const { networkConnectionBannersState, currentNetwork, updateRpc } =
    useNetworkConnectionBanners();

  if (!networkConnectionBannersState.visible || !currentNetwork) {
    return null;
  }

  return (
    <Banner
      variant={BannerVariant.Alert}
      severity={BannerAlertSeverity.Warning}
      startAccessory={<Spinner size={SpinnerSize.SM} />}
      title={strings(
        networkConnectionBannersState.status === 'slow'
          ? 'network_connection_banner.still_connecting_network'
          : 'network_connection_banner.unable_to_connect_network',
        {
          networkName: currentNetwork.name,
        },
      )}
      actionButtonProps={{
        variant: ButtonVariants.Link,
        label: strings('network_connection_banner.update_rpc'),
        onPress: updateRpc,
      }}
    />
  );
};

export default NetworkConnectionBanner;
