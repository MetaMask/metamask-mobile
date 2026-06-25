import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useMoonPaySdk } from '@moonpay/react-native-moonpay-sdk';
import { useTheme } from '../../../util/theme';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  TextColor,
  IconName,
  ButtonIcon,
  ButtonIconSize,
} from '@metamask/design-system-react-native';

// Android emulator uses 10.0.2.2 to reach the host machine's localhost
const UKYC_API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

// Bearer for the local Universal KYC service in dev
const UKYC_BEARER_TOKEN = '123';

// MoonPay publishable key for sandbox testing. Set MM_MOONPAY_API_KEY in
// .js.env (see .js.env.example) — inlined at build time by
// babel-plugin-transform-inline-environment-variables.
const MOONPAY_API_KEY = process.env.MM_MOONPAY_API_KEY ?? '';

// Demo email used when creating a MoonPay session against the local UKYC service.
const MOONPAY_DEMO_EMAIL = 'jiexi.luan@consensys.net';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    flex: 1,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  statusContainer: {
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  bold: {
    fontWeight: 'bold',
  },
  webviewContainer: {
    flex: 1,
  },
  webviewMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
});

interface MoonpaySessionResponse {
  // The signature for the widget URL (HMAC-SHA256 of the query string,
  // base64-encoded). Required by MoonPay before the widget can render.
  signature?: string;
  sessionToken?: string;
  token?: string;
  // Fallbacks the local UKYC service might use.
  url?: string;
  id?: string;
  [key: string]: unknown;
}

// Calls the local Universal KYC service to (a) create a MoonPay session for
// the user and (b) sign the widget URL with MoonPay's API secret on the
// server side. Returns the raw response so the caller can pick which fields
// to use depending on what the local service returns.
async function createMoonpaySession(
  urlToSign: string,
): Promise<MoonpaySessionResponse> {
  const response = await fetch(
    `${UKYC_API_BASE_URL}/vendors/moonpay/sessions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${UKYC_BEARER_TOKEN}`,
      },
      body: JSON.stringify({
        email: MOONPAY_DEMO_EMAIL,
        termsAcceptedAt: new Date().toISOString(),
        // Per https://dev.moonpay.com/widget/on-ramp/integration-methods/sdks/react-native
        // the server signs the widget URL with the API secret and returns the
        // signature back to the client to feed into `updateSignature`.
        // url: urlToSign,
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `POST /vendors/moonpay/sessions failed (${response.status}): ${errorBody}`,
    );
  }

  return (await response.json()) as MoonpaySessionResponse;
}

interface MoonpayWidgetProps {
  onError: (err: unknown) => void;
}

// Mirrors the canonical MoonPay React Native WebView pattern from
// https://dev.moonpay.com/widget/on-ramp/integration-methods/sdks/react-native:
//
//   1. useMoonPaySdk({ sdkConfig })
//   2. wait until `ready === true`
//   3. const url = generateUrlForSigning({ variant: 'webview' })
//   4. POST url to your backend to sign with API secret
//   5. updateSignature(signature)
//   6. render <MoonPayWebViewComponent />
//
// Note: the docs show `MoonPayWebView` and call `generateUrlForSigning()`
// with no args, but the actual SDK (`@moonpay/react-native-moonpay-sdk`
// v1.1.8) exports `MoonPayWebViewComponent` and requires `{ variant }`. The
// `react-native-webview` import inside the SDK is aliased to
// `@metamask/react-native-webview` in metro.config.js.
const MoonpayWidget: React.FC<MoonpayWidgetProps> = ({ onError }) => {
  const {
    ready,
    MoonPayWebViewComponent,
    generateUrlForSigning,
    updateSignature,
  } = useMoonPaySdk({
    sdkConfig: {
      flow: 'buy',
      environment: 'sandbox',
      params: {
        apiKey: MOONPAY_API_KEY,
      },
    },
  });

  const [phase, setPhase] = useState<'preparing' | 'ready' | 'error'>(
    'preparing',
  );
  const [phaseMessage, setPhaseMessage] = useState('Preparing MoonPay...');

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    (async () => {
      try {
        setPhaseMessage('Generating signing URL...');
        const url = generateUrlForSigning({ variant: 'webview' });
        if (!url) {
          throw new Error('generateUrlForSigning returned null');
        }

        setPhaseMessage('Creating MoonPay session...');
        const session = await createMoonpaySession(url);

        const signature =
          session.signature ?? session.sessionToken ?? session.token;

        if (!signature) {
          throw new Error(
            `MoonPay session response missing signature. Got keys: ${Object.keys(
              session,
            ).join(', ')}`,
          );
        }

        if (cancelled) return;
        updateSignature(signature);
        setPhase('ready');
      } catch (err) {
        if (cancelled) return;
        console.error('[MoonpayDemo] Sign flow failed:', err);
        setPhase('error');
        setPhaseMessage(String(err));
        onError(err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (phase !== 'ready') {
    return (
      <View style={styles.webviewMessage}>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {phaseMessage}
        </Text>
      </View>
    );
  }

  return <MoonPayWebViewComponent style={styles.webviewContainer} />;
};

const MoonpayDemo = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [showWidget, setShowWidget] = useState(false);

  const launchMoonpay = useCallback(() => {
    if (!MOONPAY_API_KEY) {
      setStatus('Missing MM_MOONPAY_API_KEY in .js.env');
      return;
    }
    setResult(null);
    setStatus(null);
    setShowWidget(true);
  }, []);

  const closeWidget = useCallback(() => {
    setShowWidget(false);
    setStatus(null);
  }, []);

  // When the widget is showing, take over the screen with the MoonPay
  // WebView so the entire flow happens inside the app.
  if (showWidget) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background.default },
        ]}
      >
        <View style={styles.header}>
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            onPress={closeWidget}
          />
          <Text variant={TextVariant.HeadingSm} style={styles.headerTitle}>
            MoonPay
          </Text>
        </View>
        <MoonpayWidget
          onError={(err) => {
            setResult({ error: String(err) });
            setStatus('Failed');
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.default }]}
    >
      <View style={styles.header}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={() => navigation.goBack()}
        />
        <Text variant={TextVariant.HeadingSm} style={styles.headerTitle}>
          MoonPay Demo
        </Text>
      </View>

      <View style={styles.content}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          Sign the MoonPay widget URL via the local Universal KYC service and
          render the sandbox widget inside this app.
        </Text>

        {status && (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {status}
          </Text>
        )}

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={launchMoonpay}
        >
          Test MoonPay
        </Button>

        {result && (
          <View
            style={[
              styles.statusContainer,
              { backgroundColor: colors.background.alternative },
            ]}
          >
            <Text variant={TextVariant.BodySm} style={styles.bold}>
              Result
            </Text>
            {Object.entries(result).map(([key, value]) => (
              <View key={key} style={styles.statusRow}>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {key}
                </Text>
                <Text variant={TextVariant.BodySm}>{String(value)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default MoonpayDemo;
