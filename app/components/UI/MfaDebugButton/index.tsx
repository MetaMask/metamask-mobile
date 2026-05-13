import React, { useCallback, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import Logger from '../../../util/Logger';

/**
 * TEMP debug — creates a fake CLI-MFA session and opens its deeplink directly.
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

const getMockBackendUrl = () =>
  Platform.OS === 'ios' ? 'http://localhost:3000' : 'http://10.0.2.2:3000';

const buildCliLoginDeeplink = (sessionId: string, server: string) =>
  `https://link.metamask.io/cli-login?sessionId=${encodeURIComponent(
    sessionId,
  )}&server=${encodeURIComponent(server)}`;

const MfaDebugButton: React.FC = () => {
  const [counter, setCounter] = useState(0);

  const onPress = useCallback(async () => {
    const backendUrl = getMockBackendUrl();

    // First create a real session on the mock backend so the SPA's
    // /api/cli/session lookup succeeds. SKIP_PUSH=true on the backend means
    // this won't send an FCM push.
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
      deeplink = buildCliLoginDeeplink(json.sessionId, backendUrl);
    } catch (err) {
      Logger.error(err as Error, 'MfaDebugButton: backend initiate failed');
      // eslint-disable-next-line no-console -- TEMP debug
      console.log(
        '[MfaDebug:fire] backend unreachable —',
        `is mfa-backend running on ${backendUrl} with SKIP_PUSH=true?`,
        err,
      );
      return;
    }

    // eslint-disable-next-line no-console -- TEMP debug
    console.log(
      '[MfaDebug:fire]',
      JSON.stringify({
        sessionId,
        deeplink,
      }),
    );

    try {
      await Linking.openURL(deeplink);
      // eslint-disable-next-line no-console -- TEMP debug
      console.log('[MfaDebug:fire] Linking.openURL OK');
      setCounter((c) => c + 1);
    } catch (err) {
      // eslint-disable-next-line no-console -- TEMP debug
      console.log('[MfaDebug:fire] Linking.openURL threw', err);
      Logger.error(err as Error, 'MfaDebugButton: deeplink open failed');
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
          🧪 Open CLI-MFA deeplink{counter > 0 ? ` (${counter})` : ''}
        </Text>
      </Pressable>
      <Text style={styles.hint}>
        Creates a mock session, then opens the MetaMask deeplink to test
        MfaWebview routing.
      </Text>
    </View>
  );
};

export default MfaDebugButton;
