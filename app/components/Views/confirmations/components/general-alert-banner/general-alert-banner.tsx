import React from 'react';
import { View } from 'react-native';
import { useAlerts } from '../../context/alert-system-context';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import styleSheet from './general-alert-banner.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { getBannerAlertSeverity } from '../../utils/alert-system';

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
          testID={`security-alert-banner-${index}`}
        />
      ))}
    </View>
  );
};

export default GeneralAlertBanner;
