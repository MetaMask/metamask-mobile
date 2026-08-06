import React, { useState, useEffect, useCallback } from 'react';
import { View, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import PreventScreenshot from '../../../core/PreventScreenshot';
import { MetaMetricsEvents } from '../../../core/Analytics';
import useScreenshotDeterrent from '../../hooks/useScreenshotDeterrent';
import { SRP_GUIDE_URL } from '../../../constants/urls';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';

let activeScreenCaptureBlocks = 0;

const useScreenCaptureBlock = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    activeScreenCaptureBlocks += 1;
    if (activeScreenCaptureBlocks === 1) {
      PreventScreenshot.forbid();
    }

    return () => {
      activeScreenCaptureBlocks -= 1;
      if (activeScreenCaptureBlocks === 0) {
        PreventScreenshot.allow();
      }
    };
  }, [enabled]);
};

const ScreenshotDeterrentWithoutNavigation = ({
  enabled,
}: {
  enabled: boolean;
}) => {
  useScreenCaptureBlock(enabled);

  return <View />;
};

const ScreenshotDeterrentWithNavigation = ({
  enabled,
  isSRP,
}: {
  enabled: boolean;
  isSRP: boolean;
}) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [alertPresent, setAlertPresent] = useState<boolean>(false);
  const navigation = useNavigation<AppNavigationProp>();

  const openSRPGuide = useCallback(() => {
    setAlertPresent(false);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SCREENSHOT_LEARN_MORE).build(),
    );
    Linking.openURL(SRP_GUIDE_URL);
  }, [trackEvent, createEventBuilder]);

  const showScreenshotAlert = useCallback(() => {
    if (isSRP) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SRP_SCREENSHOT_ATTEMPTED).build(),
      );
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SCREENSHOT_WARNING).build(),
    );
    setAlertPresent(true);

    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.MODAL_CONFIRMATION,
      params: {
        title: strings('screenshot_deterrent.title'),
        description: strings('screenshot_deterrent.description', {
          credentialName: isSRP
            ? strings('screenshot_deterrent.srp_text')
            : strings('screenshot_deterrent.priv_key_text'),
        }),
        onCancel: () => {
          setAlertPresent(false);
          trackEvent(
            createEventBuilder(MetaMetricsEvents.SCREENSHOT_OK).build(),
          );
        },
        onConfirm: openSRPGuide,
        confirmLabel: strings('reveal_credential.learn_more'),
        cancelLabel: strings('reveal_credential.got_it'),
      },
    });
  }, [isSRP, navigation, trackEvent, openSRPGuide, createEventBuilder]);

  const [enableScreenshotWarning] = useScreenshotDeterrent(showScreenshotAlert);

  useScreenCaptureBlock(enabled);

  useEffect(() => {
    enableScreenshotWarning(enabled && !alertPresent);
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
  hasNavigation?: boolean;
}) =>
  hasNavigation ? (
    <ScreenshotDeterrentWithNavigation enabled={enabled} isSRP={isSRP} />
  ) : (
    <ScreenshotDeterrentWithoutNavigation enabled={enabled} />
  );

export default ScreenshotDeterrent;
