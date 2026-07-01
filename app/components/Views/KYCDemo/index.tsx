import React, { useCallback, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import SNSMobileSDK from '@sumsub/react-native-mobilesdk-module';
import { useTheme } from '../../../util/theme';
import Engine from '../../../core/Engine';
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';
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
});

// async function signAuthMessage(address: string): Promise<string> {
//   const message = JSON.stringify({ api: true });
//   const hexMessage = '0x' + Buffer.from(message, 'utf8').toString('hex');
//   return Engine.context.KeyringController.signPersonalMessage({
//     data: hexMessage,
//     from: address,
//   });
// }

async function getBearerToken(): Promise<string> {
  const bearerToken =
    await Engine.context.AuthenticationController.getBearerToken();
  if (!bearerToken) {
    throw new Error(
      'Unable to obtain an authentication bearer token — is the wallet signed in?',
    );
  }
  return bearerToken;
}

async function createSession(jwtToken: string): Promise<string> {
  const bearerToken = await getBearerToken();
  const response = await fetch(`${UKYC_API_BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify({
      vendorId: 'moonpay',
      vendorUserId: 'mockedId',
      jwtToken,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`POST /sessions failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.sessionId ?? data.id;
}

async function fetchAccessToken(
  sessionId: string,
  jwtToken: string,
): Promise<string> {
  const bearerToken = await getBearerToken();
  const response = await fetch(
    `${UKYC_API_BASE_URL}/sessions/${sessionId}/wrapped-key`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({ jwtToken }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `POST /sessions/${sessionId}/wrapped-key failed (${response.status}): ${errorBody}`,
    );
  }

  const data = await response.json();
  return data.accessToken ?? data.token;
}

const KYCDemo = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);

  const [sdkResult, setSdkResult] = useState<Record<string, unknown> | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const launchSumSubSDK = useCallback(async () => {
    if (!selectedAddress) {
      setStatus('No account selected');
      return;
    }

    setIsLoading(true);
    setSdkResult(null);
    setStatus(null);

    try {
      // setStatus('Signing authentication message...');
      // const jwtToken = await signAuthMessage(selectedAddress);

      setStatus('Creating UKYC session...');
      const mockJwtToken = 'mock-jwt-token';
      const sessionId = await createSession(mockJwtToken);

      setStatus('Fetching access token...');
      const accessToken = await fetchAccessToken(sessionId, mockJwtToken);

      setStatus('Launching SumSub SDK...');
      const snsMobileSDK = SNSMobileSDK.init(accessToken, async () => {
        const refreshedToken = await fetchAccessToken(sessionId, mockJwtToken);
        return refreshedToken;
      })
        .withHandlers({
          onStatusChanged: (event: {
            prevStatus: string;
            newStatus: string;
          }) => {
            console.log(
              `[SumSub] Status: ${event.prevStatus} => ${event.newStatus}`,
            );
          },
          onLog: (event: { message: string }) => {
            console.log(`[SumSub] ${event.message}`);
          },
        })
        .withDebug(true)
        .withLocale('en')
        .build();

      const result: Record<string, unknown> = await snsMobileSDK.launch();
      console.log('[SumSub] Result:', JSON.stringify(result));
      setSdkResult(result);
      setStatus('Complete');
    } catch (err) {
      console.error('[KYCDemo] Error:', err);
      setSdkResult({ error: String(err) });
      setStatus('Failed');
    } finally {
      setIsLoading(false);
    }
  }, [selectedAddress]);

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
          KYC Demo (Sumsub)
        </Text>
      </View>

      <View style={styles.content}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          Launch the Sumsub identity verification flow. This will sign a message
          with your connected account, create a UKYC session, and retrieve an
          access token for SumSub.
        </Text>

        {selectedAddress && (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            Account: {selectedAddress.slice(0, 6)}...
            {selectedAddress.slice(-4)}
          </Text>
        )}

        {status && (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {status}
          </Text>
        )}

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={launchSumSubSDK}
          isDisabled={isLoading || !selectedAddress}
        >
          {isLoading ? 'Launching...' : 'Start KYC Verification'}
        </Button>

        {sdkResult && (
          <View
            style={[
              styles.statusContainer,
              { backgroundColor: colors.background.alternative },
            ]}
          >
            <Text variant={TextVariant.BodySm} style={styles.bold}>SDK Result</Text>
            {Object.entries(sdkResult).map(([key, value]) => (
              <View key={key} style={styles.statusRow}>
                <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
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

export default KYCDemo;
