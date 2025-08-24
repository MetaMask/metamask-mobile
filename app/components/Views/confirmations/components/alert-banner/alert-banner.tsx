import React from 'react';
import { useAlerts } from '../../context/alert-system-context';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import styleSheet from './alert-banner.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { getBannerAlertSeverity } from '../../utils/alert-system';
import { RowAlertKey } from '../UI/info-row/alert-row/constants';

export interface AlertBannerProps {
  blockingFields?: boolean;
  excludeFields?: RowAlertKey[];
  inline?: boolean;
}

const AlertBanner = ({
  blockingFields,
  excludeFields,
  inline,
}: AlertBannerProps = {}) => {
  const { generalAlerts, fieldAlerts } = useAlerts();
  const { styles } = useStyles(styleSheet, { inline });

  const alerts = blockingFields
    ? fieldAlerts.filter(
        (a) => a.isBlocking && !excludeFields?.includes(a.field as RowAlertKey),
      )
    : generalAlerts;

  if (alerts.length === 0) {
    return null;
  }

  // Temporary loop throw all general alerts until design team establishes a design for multiple general alerts
  return (
    <>
      {alerts.map((selectedAlert, index) => (
        <BannerAlert
          key={`banner-alert-${index}`}
          severity={getBannerAlertSeverity(selectedAlert.severity)}
          title={selectedAlert.title}
          description={selectedAlert.content ?? selectedAlert.message}
          style={styles.wrapper}
          testID={`security-alert-banner-${index}`}
        />
      ))}
    </>
  );
};

export default AlertBanner;
