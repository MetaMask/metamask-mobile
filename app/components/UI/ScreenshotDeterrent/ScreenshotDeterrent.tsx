import React, { useState, useEffect, useCallback } from 'react';
import { View, Linking, InteractionManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PreventScreenshot from '../../../core/PreventScreenshot';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import useScreenshotDeterrent from '../../hooks/useScreenshotDeterrent';
import { SRP_GUIDE_URL } from '../../../constants/urls';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import { ModalConfirmationVariants } from '../../../component-library/components/Modals/ModalConfirmation';

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
  const navigation = useNavigation();

  const openSRPGuide = () => {
    setAlertPresent(false);
    AnalyticsV2.trackEvent(MetaMetricsEvents.SCREENSHOT_LEARN_MORE, {});
    Linking.openURL(SRP_GUIDE_URL);
  };

  const showScreenshotAlert = useCallback(() => {
    AnalyticsV2.trackEvent(MetaMetricsEvents.SCREENSHOT_WARNING, {});
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
        onCancel: () => {
          setAlertPresent(false);
          AnalyticsV2.trackEvent(MetaMetricsEvents.SCREENSHOT_OK, {});
        },
        onConfirm: openSRPGuide,
        confirmLabel: strings('reveal_credential.learn_more'),
        cancelLabel: strings('reveal_credential.got_it'),
      },
    });
  }, [isSRP, navigation]);

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
