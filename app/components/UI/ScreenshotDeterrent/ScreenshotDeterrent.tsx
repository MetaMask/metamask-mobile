import React, { useState, useEffect, useCallback } from 'react';
import { View, Alert, Linking } from 'react-native';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import useScreenshotWarning from '../../hooks/useScreenshotWarning';
import { SRP_GUIDE_URL } from '../../../constants/urls';
import { strings } from '../../../../locales/i18n';

const ScreenshotDeterrent = ({
  enabled,
  isSRP,
}: {
  enabled: boolean;
  isSRP: boolean;
}) => {
  const [alertPresent, setAlertPresent] = useState<boolean>(false);

  const openSRPGuide = () => {
    setAlertPresent(false);
    AnalyticsV2.trackEvent(MetaMetricsEvents.SCREENSHOT_WARNING, {});
    Linking.openURL(SRP_GUIDE_URL);
  };

  const showScreenshotAlert = useCallback(() => {
    AnalyticsV2.trackEvent(MetaMetricsEvents.SCREENSHOT_WARNING, {});
    setAlertPresent(true);

    Alert.alert(
      strings('screenshot_deterrent.title'),
      strings('screenshot_deterrent.description', {
        credentialName: isSRP
          ? strings('screenshot_deterrent.srp_text')
          : strings('screenshot_deterrent.priv_key_text'),
      }),
      [
        {
          text: strings('reveal_credential.learn_more'),
          onPress: openSRPGuide,
          style: 'cancel',
        },
        {
          text: strings('reveal_credential.got_it'),
          onPress: () => {
            setAlertPresent(false);
            AnalyticsV2.trackEvent(MetaMetricsEvents.SCREENSHOT_OK, {});
          },
        },
      ],
    );
  }, [isSRP]);

  const [enableScreenshotWarning] = useScreenshotWarning(showScreenshotAlert);

  useEffect(
    () => enableScreenshotWarning(enabled && !alertPresent),
    [alertPresent, enableScreenshotWarning, enabled],
  );

  return <View />;
};

export default ScreenshotDeterrent;
