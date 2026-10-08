import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { capitalize } from '../../../../../util/general';

const EarnMaintenanceBanner = ({
  experienceName,
}: {
  experienceName: Extract<
    EARN_EXPERIENCES,
    'POOLED_STAKING' | 'STABLECOIN_LENDING'
  >;
}) => {
  const formattedExperienceName = experienceName
    .toLowerCase()
    .split('_')
    .map(capitalize)
    .join(' ');

  const maintenanceMessage = strings(
    'earn.service_interruption_banner.maintenance_message',
    {
      experienceName: formattedExperienceName,
    },
  );

  return (
    <BannerAlert
      severity={BannerAlertSeverity.Warning}
      description={maintenanceMessage}
    />
  );
};

export default EarnMaintenanceBanner;
