import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useSupportConsent } from '../../../../hooks/useSupportConsent';
import { selectPerpsServiceInterruptionBannerEnabledFlag } from '../../selectors/featureFlags';
import { SUPPORT_CONFIG } from '../../constants/perpsConfig';
import type { PerpsServiceInterruptionBannerProps } from './PerpsServiceInterruptionBanner.types';

const PerpsServiceInterruptionBanner: React.FC<
  PerpsServiceInterruptionBannerProps
> = ({ testID = 'perps-service-interruption-banner' }) => {
  const isEnabled = useSelector(
    selectPerpsServiceInterruptionBannerEnabledFlag,
  );
  const navigation = useNavigation();
  const { openSupportWithConsent } = useSupportConsent();

  const handleSupportPress = useCallback(() => {
    openSupportWithConsent(
      (url) =>
        navigation.navigate(Routes.WEBVIEW.MAIN, {
          screen: Routes.WEBVIEW.SIMPLE,
          params: {
            url,
            title: strings(SUPPORT_CONFIG.TitleKey),
          },
        }),
      SUPPORT_CONFIG.Url,
    );
  }, [navigation, openSupportWithConsent]);

  if (!isEnabled) {
    return null;
  }

  return (
    <BannerAlert
      severity={BannerAlertSeverity.Warning}
      title={strings('perps.service_interruption.title')}
      description={strings('perps.service_interruption.description')}
      actionButtonLabel={strings('perps.service_interruption.contact_support')}
      actionButtonOnPress={handleSupportPress}
      testID={testID}
    />
  );
};

export default PerpsServiceInterruptionBanner;
