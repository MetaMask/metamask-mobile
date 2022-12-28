import React, { useState, useEffect, useCallback } from 'react';
import { View, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AnalyticsV2 from '../../../util/analyticsV2';
import useScreenshotWarning from '../../hooks/useScreenshotWarning';
import { SRP_GUIDE_URL } from '../../../constants/urls';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import { ModalConfirmationVariants } from '../../../component-library/components/Modals/ModalConfirmation';

const ScreenshotDeterrent = ({
  enabled,
  isSRP,
}: {
  enabled: boolean;
  isSRP: boolean;
}) => {
  const [alertPresent, setAlertPresent] = useState<boolean>(false);
  const navigation = useNavigation();

  const openSRPGuide = () => {
    setAlertPresent(false);
    AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.SCREENSHOT_WARNING, {});
    Linking.openURL(SRP_GUIDE_URL);
  };

  const showScreenshotAlert = useCallback(() => {
    AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.SCREENSHOT_WARNING, {});
    setAlertPresent(true);

    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.MODAL_CONFIRMATION,
      params: {
        variant: ModalConfirmationVariants.Normal,
        title: strings('screenshot_deterrent.title'),
        description: strings('screenshot_deterrent.description', {
          credentialName: isSRP
            ? strings('screenshot_deterrent.srp_text')
            : strings('screenshot_deterrent.priv_key_text'),
        }),
        onConfirm: () => {
          setAlertPresent(false);
          AnalyticsV2.trackEvent(
            AnalyticsV2.ANALYTICS_EVENTS.SCREENSHOT_OK,
            {},
          );
        },
        onCancel: openSRPGuide,
        cancelLabel: strings('reveal_credential.learn_more'),
        confirmLabel: strings('reveal_credential.got_it'),
      },
    });
  }, [isSRP, navigation]);

  const [enableScreenshotWarning] = useScreenshotWarning(showScreenshotAlert);

  useEffect(
    () => enableScreenshotWarning(enabled && !alertPresent),
    [alertPresent, enableScreenshotWarning, enabled],
  );

  return <View />;
};

export default ScreenshotDeterrent;
