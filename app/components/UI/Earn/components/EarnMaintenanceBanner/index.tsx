import React from 'react';
import Banner, {
  BannerVariant,
  BannerAlertSeverity,
} from '../../../../../component-library/components/Banners/Banner';
import { strings } from '../../../../../../locales/i18n';

const EarnMaintenanceBanner = () => {
  const maintenanceMessage = strings(
    'earn.service_interruption_banner.maintenance_message',
  );

  return (
    <Banner
      severity={BannerAlertSeverity.Warning}
      variant={BannerVariant.Alert}
      description={maintenanceMessage}
    />
  );
};

export default EarnMaintenanceBanner;
