import React, { useCallback, useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import NotificationsService from '../../../util/notifications/services/NotificationService';
import { PressActionId } from '../../../util/notifications/types';
import Logger from '../../../util/Logger';

/**
 * TEMP debug — fires a fake CLI-MFA notification into the OS tray, no FCM needed.
 * Tap the resulting tray entry in any app state (foreground / background / killed)
 * to exercise the same code path a real push would use:
 * Notifee press handler -> handleDeeplink -> saga -> MfaWebview.
 *
 * Remove before commit. Gated behind __DEV__ so it can never ship.
 */
/* eslint-disable react-native/no-color-literals,@metamask/design-tokens/color-no-hex -- TEMP debug component, removed before commit */

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  button: {
    backgroundColor: '#0376C9',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    color: '#6A737D',
    fontSize: 11,
    marginTop: 4,
  },
});

const SAMPLE_DEEPLINK_LOGIN =
  'https://link.metamask.io/cli-login?sessionId=dev-' +
  Date.now() +
  '&server=' +
  encodeURIComponent('http://10.0.2.2:3000');

const MfaDebugButton: React.FC = () => {
  const [counter, setCounter] = useState(0);

  const onPress = useCallback(async () => {
    const backendUrl = 'http://10.0.2.2:3000';

    // First create a real session on the mock backend so the SPA's
    // /api/cli/session lookup succeeds. SKIP_PUSH=true on the backend means
    // this won't actually send an FCM push — we display the notification
    // ourselves below via Notifee.
    let sessionId: string;
    let deeplink: string;
    try {
      const res = await fetch(`${backendUrl}/api/cli/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fcmToken: 'mfa-debug-button-no-real-push',
          intent: 'login',
        }),
      });
      if (!res.ok) throw new Error(`initiate HTTP ${res.status}`);
      const json = (await res.json()) as {
        sessionId: string;
        deeplink: string;
      };
      sessionId = json.sessionId;
      deeplink = json.deeplink;
    } catch (err) {
      Logger.error(err as Error, 'MfaDebugButton: backend initiate failed');
      // eslint-disable-next-line no-console -- TEMP debug
      console.log(
        '[MfaDebug:fire] backend unreachable —',
        'is mfa-backend running on http://localhost:3000 with SKIP_PUSH=true?',
        err,
      );
      return;
    }

    // eslint-disable-next-line no-console -- TEMP debug
    console.log(
      '[MfaDebug:fire]',
      JSON.stringify({
        sessionId,
        pressActionId: PressActionId.OPEN_CLI_MFA,
        deeplink,
      }),
    );

    try {
      await NotificationsService.displayNotification({
        id: sessionId,
        pressActionId: PressActionId.OPEN_CLI_MFA,
        title: 'Approve CLI sign-in',
        body: 'Tap to review.',
        data: { deeplink },
      });
      // eslint-disable-next-line no-console -- TEMP debug
      console.log('[MfaDebug:fire] displayNotification OK');
      setCounter((c) => c + 1);
    } catch (err) {
      // eslint-disable-next-line no-console -- TEMP debug
      console.log('[MfaDebug:fire] displayNotification threw', err);
      Logger.error(err as Error, 'MfaDebugButton: displayNotification failed');
    }
  }, []);

  if (!__DEV__) return null;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <Text style={styles.label}>
          🧪 Fire fake CLI-MFA push{counter > 0 ? ` (${counter})` : ''}
        </Text>
      </Pressable>
      <Text style={styles.hint}>
        Sends a Notifee tray entry. Tap it (any app state) to test MfaWebview
        routing. {SAMPLE_DEEPLINK_LOGIN.length > 0 ? '' : ''}
      </Text>
    </View>
  );
};

export default MfaDebugButton;
