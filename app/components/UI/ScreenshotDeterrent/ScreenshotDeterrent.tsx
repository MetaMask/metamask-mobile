import React, { useState, useEffect, useCallback } from 'react';
import { View, Alert, Linking, InteractionManager } from 'react-native';
import PreventScreenshot from '../../../core/PreventScreenshot';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import useScreenshotDeterrent from '../../hooks/useScreenshotDeterrent';
import { SRP_GUIDE_URL } from '../../../constants/urls';
import { strings } from '../../../../locales/i18n';

const ScreenshotDeterrentWithoutNavigation = ({
  enabled,
}: {
  enabled: boolean;
}) => {
  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      PreventScreenshot.forbid();
    });

    return () => {
      InteractionManager.runAfterInteractions(() => {
        PreventScreenshot.allow();
      });
    };
  }, [enabled]);

  return <View />;
};

const ScreenshotDeterrentWithNavigation = ({
  enabled,
  isSRP,
}: {
  enabled: boolean;
  isSRP: boolean;
}) => {
  const [alertPresent, setAlertPresent] = useState<boolean>(false);

  const openSRPGuide = () => {
    setAlertPresent(false);
    AnalyticsV2.trackEvent(MetaMetricsEvents.SCREENSHOT_LEARN_MORE, {});
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

  const [enableScreenshotWarning] = useScreenshotDeterrent(showScreenshotAlert);

  useEffect(() => {
    enableScreenshotWarning(enabled && !alertPresent);
    InteractionManager.runAfterInteractions(() => {
      PreventScreenshot.forbid();
    });

    return () => {
      InteractionManager.runAfterInteractions(() => {
        PreventScreenshot.allow();
      });
    };
  }, [alertPresent, enableScreenshotWarning, enabled]);

  return <View />;
};

const ScreenshotDeterrent = ({
  enabled,
  isSRP,
  hasNavigation = true,
}: {
  enabled: boolean;
  isSRP: boolean;
  hasNavigation: boolean;
}) =>
  hasNavigation ? (
    <ScreenshotDeterrentWithNavigation enabled={enabled} isSRP={isSRP} />
  ) : (
    <ScreenshotDeterrentWithoutNavigation enabled={enabled} />
  );

export default ScreenshotDeterrent;
