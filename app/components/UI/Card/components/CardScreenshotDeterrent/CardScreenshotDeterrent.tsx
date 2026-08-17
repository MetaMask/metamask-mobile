import React, { useEffect, useCallback, useRef } from 'react';
import { View, Alert, InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import PreventScreenshot, {
  CAPTURE_KEYS,
} from '../../../../../core/PreventScreenshot';
import useScreenshotDeterrent from '../../../../hooks/useScreenshotDeterrent';
import { strings } from '../../../../../../locales/i18n';

interface CardScreenshotDeterrentProps {
  /** Whether screenshot protection is enabled */
  enabled: boolean;
}

/**
 * Component to prevent screenshots when viewing sensitive card details.
 * On Android: Blocks screenshots completely via FLAG_SECURE
 * On iOS: Shows a native alert warning when a screenshot is detected
 */
const CardScreenshotDeterrent = ({ enabled }: CardScreenshotDeterrentProps) => {
  const alertShownRef = useRef(false);

  const showScreenshotAlert = useCallback(() => {
    // Prevent multiple alerts from showing
    if (alertShownRef.current) {
      return;
    }
    alertShownRef.current = true;

    Alert.alert(
      strings('screenshot_deterrent.title'),
      strings('screenshot_deterrent.card_description'),
      [
        {
          text: strings('reveal_credential.got_it'),
          onPress: () => {
            alertShownRef.current = false;
          },
        },
      ],
      { cancelable: false },
    );
  }, []);

  const [enableScreenshotWarning] = useScreenshotDeterrent(showScreenshotAlert);

  // Enable/disable screenshot warning based on enabled prop
  useEffect(() => {
    enableScreenshotWarning(enabled);
  }, [enabled, enableScreenshotWarning]);

  // Block screenshots on Android when enabled
  useFocusEffect(
    useCallback(() => {
      if (enabled) {
        InteractionManager.runAfterInteractions(() => {
          PreventScreenshot.forbid(CAPTURE_KEYS.card);
        });
      }

      return () => {
        // Only call allow() if forbid() was called (when enabled was true).
        // The card's own key keeps this release from clearing the flag while
        // another owner still holds it — see CAPTURE_KEYS.
        if (enabled) {
          InteractionManager.runAfterInteractions(() => {
            PreventScreenshot.allow(CAPTURE_KEYS.card);
          });
        }
        alertShownRef.current = false;
      };
    }, [enabled]),
  );

  return <View />;
};

export default CardScreenshotDeterrent;
