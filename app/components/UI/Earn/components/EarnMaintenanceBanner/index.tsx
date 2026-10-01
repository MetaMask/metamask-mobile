import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

const EarnMaintenanceBanner = () => {
  const maintenanceMessage = strings(
    'earn.service_interruption_banner.maintenance_message',
  );

  return (
    <BannerAlert
      severity={BannerAlertSeverity.Warning}
      description={maintenanceMessage}
      // A single wrapping description centers the icon. Pin it to the first line.
      iconProps={{ twClassName: 'self-start' }}
    />
  );
};

export default EarnMaintenanceBanner;
