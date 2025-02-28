import React from 'react';
import { View } from 'react-native';
import { useAlerts } from '../context';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { Severity } from '../../types/alerts';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner';
import styleSheet from './GeneralAlertBanner.styles';
import { useStyles } from '../../../../hooks/useStyles';

/**
 * Converts the severity of a banner alert to the corresponding BannerAlertSeverity.
 *
 * @param severity - The severity of the banner alert.
 * @returns The corresponding BannerAlertSeverity.
 */
export function getBannerAlertSeverity(
  severity: Severity,
): BannerAlertSeverity {
  switch (severity) {
    case Severity.Danger:
      return BannerAlertSeverity.Error;
    case Severity.Warning:
      return BannerAlertSeverity.Warning;
    default:
      return BannerAlertSeverity.Info;
  }
}

const GeneralAlertBanner = () => {
  const { generalAlerts } = useAlerts();
  const { styles } = useStyles(styleSheet, {});

  if (generalAlerts.length === 0) {
    return null;
  }

  // Temporary loop throw all general alerts until design team establishes a design for multiple general alerts
  return (
    <View>
      {generalAlerts.map((selectedAlert, index) => (
        <BannerAlert
          key={`banner-alert-${index}`}
          severity={getBannerAlertSeverity(selectedAlert.severity)}
          title={selectedAlert.title}
          description={selectedAlert.content ?? selectedAlert.message}
          style={styles.wrapper}
        />
      ))}
    </View>
  );
};

export default GeneralAlertBanner;
