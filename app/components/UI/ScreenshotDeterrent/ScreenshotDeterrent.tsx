import React, { useEffect, useCallback } from 'react';
import { View, Alert, Linking } from 'react-native';
import AnalyticsV2 from '../../../util/analyticsV2';
import useScreenshotWarning from '../../hooks/useScreenshotWarning';
import { SRP_GUIDE_URL } from '../../../constants/urls';
import { strings } from '../../../../locales/i18n';

const ScreenshotDeterrent = ({ enabled }: { enabled: boolean }) => {
  const openSRPGuide = () => {
    AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.SCREENSHOT_WARNING, {});
    Linking.openURL(SRP_GUIDE_URL);
  };

  const showScreenshotAlert = useCallback(() => {
    AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.SCREENSHOT_WARNING, {});

    Alert.alert(
      strings('manual_backup_step_1.screenshot_warning_title'),
      strings('manual_backup_step_1.screenshot_warning_desc'),
      [
        {
          text: strings('reveal_credential.learn_more'),
          onPress: openSRPGuide,
          style: 'cancel',
        },
        {
          text: strings('reveal_credential.got_it'),
          onPress: () =>
            AnalyticsV2.trackEvent(
              AnalyticsV2.ANALYTICS_EVENTS.SCREENSHOT_OK,
              {},
            ),
        },
      ],
    );
  }, []);

  const [enableScreenshotWarning] = useScreenshotWarning(showScreenshotAlert);

  useEffect(
    () => enableScreenshotWarning(enabled),
    [enableScreenshotWarning, enabled],
  );

  return <View />;
};

export default ScreenshotDeterrent;
