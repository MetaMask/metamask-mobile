import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { SUPPORT_CONFIG } from '../../constants/perpsConfig';
import { selectPerpsServiceInterruptionBannerEnabledFlag } from '../../selectors/featureFlags';
import type { PerpsServiceInterruptionBannerProps } from './PerpsServiceInterruptionBanner.types';

const PerpsServiceInterruptionBanner: React.FC<
  PerpsServiceInterruptionBannerProps
> = ({ testID = 'perps-service-interruption-banner' }) => {
  const isEnabled = useSelector(
    selectPerpsServiceInterruptionBannerEnabledFlag,
  );
  const navigation = useNavigation();

  const handleSupportPress = useCallback(() => {
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: SUPPORT_CONFIG.Url,
        title: strings(SUPPORT_CONFIG.TitleKey),
      },
    });
  }, [navigation]);

  if (!isEnabled) {
    return null;
  }

  return (
    <Box twClassName="px-4" testID={testID}>
      <BannerAlert
        severity={BannerAlertSeverity.Warning}
        iconProps={{ name: IconName.FlashSlash }}
        title={strings('perps.service_interruption.title')}
        description={strings('perps.service_interruption.description')}
        actionButtonLabel={strings(
          'perps.service_interruption.contact_support',
        )}
        actionButtonOnPress={handleSupportPress}
        actionButtonProps={{
          testID: `${testID}-support-link`,
        }}
      />
    </Box>
  );
};

export default PerpsServiceInterruptionBanner;
