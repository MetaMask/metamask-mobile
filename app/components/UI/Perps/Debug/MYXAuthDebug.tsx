/**
 * MYXAuthDebug - Diagnostic tool to identify MYX auth issues
 *
 * Toggle between environments for consistent testing:
 * - Testnet: chainId 97 (BNB testnet) + isBetaMode: true + beta API endpoints
 * - Mainnet: chainId 56 (BNB mainnet) + isBetaMode: false + mainnet API endpoints
 *
 * This ensures token, HTTP, and WebSocket all use the same environment,
 * eliminating mismatches where beta tokens fail on mainnet WebSocket.
 *
 * Investigation Tests:
 * - Test 4a: SDK WS Auth (uses sdk.{token} format internally)
 * - Test 4b: Manual WS Auth with raw token
 * - Test 4c: Manual WS Auth with sdk.{token} format
 *
 * This helps isolate whether 9401 errors are caused by token format or server config.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MyxClient } from '@myx-trade/sdk';
import Crypto from 'react-native-quick-crypto';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import { useTheme } from '../../../../util/theme';
import Engine from '../../../../core/Engine';
import { getMYXBrokerAddress } from '../constants/myxConfig';
import styleSheet from './MYXAuthDebug.styles';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'pass' | 'fail';
  details?: string;
  error?: string;
}

interface EnvConfig {
  chainId: number;
  isBetaMode: boolean;
  isTestnet: boolean;
  tokenApi: string;
  wsUrl: string;
}

const getEnvConfig = (testnet: boolean): EnvConfig => ({
  chainId: testnet ? 97 : 56,
  isBetaMode: testnet,
  isTestnet: testnet,
  tokenApi: testnet
    ? 'https://api-beta.myx.finance/openapi/gateway/auth/api_key/create_token'
    : 'https://api.myx.finance/openapi/gateway/auth/api_key/create_token',
  wsUrl: testnet
    ? 'wss://oapi-beta.myx.finance/ws'
    : 'wss://oapi.myx.finance/ws',
});

/**
 * Fetch a fresh access token from MYX API.
 * Used to test if existing tokens were invalidated by previous connections.
 */
const fetchFreshToken = async (
  tokenApi: string,
  address: string,
  log: (msg: string) => void,
  envName: string,
): Promise<string | null> => {
  try {
    const appId = 'metamask';
    const secret = 'vcVSelUYUfcepmOKGemyfC0dcxQDhCg1';
    const timestamp = Math.floor(Date.now() / 1000);
    const expireTime = 3600;
    const payload = `${appId}&${timestamp}&${expireTime}&${address}&${secret}`;
    const signature = Crypto.createHash('sha256').update(payload).digest('hex');
    const url = `${tokenApi}?appId=${appId}&timestamp=${timestamp}&expireTime=${expireTime}&allowAccount=${address}&signature=${signature}`;

    log(`[${envName}] Fetching fresh token...`);
    const response = await fetch(url);
    const result = await response.json();

    if (result.data?.accessToken) {
      log(`[${envName}] Fresh token: ${result.data.accessToken.slice(0, 12)}...`);
      return result.data.accessToken;
    }
    log(`[${envName}] Fresh token failed: ${JSON.stringify(result)}`);
    return null;
  } catch (err) {
    log(`[${envName}] Fresh token error: ${err}`);
    return null;
  }
};

/**
 * Manual WebSocket auth test - bypasses SDK to test token formats directly.
 * This helps isolate whether 9401 errors are from token format vs server config.
 */
const testManualWebSocketAuth = (
  wsUrl: string,
  tokenArg: string,
  formatLabel: string,
  log: (msg: string) => void,
  envName: string,
): Promise<TestResult> => new Promise((resolve) => {
    const testName = `4${formatLabel === 'raw' ? 'b' : 'c'}. Manual WS (${formatLabel})`;
    const ws = new WebSocket(wsUrl);
    const timeout = setTimeout(() => {
      ws.close();
      resolve({ name: testName, status: 'fail', error: 'Connection timeout (8s)' });
    }, 8000);

    ws.onopen = () => {
      log(`[${envName}] Manual WS connected, sending signin with ${formatLabel} format`);
      const request = JSON.stringify({ request: 'signin', args: tokenArg });
      log(`[${envName}] Sending: ${request.slice(0, 100)}...`);
      ws.send(request);
    };

    ws.onmessage = (event) => {
      clearTimeout(timeout);
      const responseData = typeof event.data === 'string' ? event.data : String(event.data);
      log(`[${envName}] Manual WS response (${formatLabel}): ${responseData}`);

      try {
        const response = JSON.parse(responseData);
        const code = response?.data?.code ?? response?.code;
        const msg = response?.data?.msg ?? response?.msg ?? '';

        // MYX uses code=0 for success on some endpoints, code=9200 on others
        if (code === 0 || code === 9200) {
          ws.close();
          resolve({
            name: testName,
            status: 'pass',
            details: `${formatLabel} token worked! code=${code}`,
          });
        } else {
          ws.close();
          resolve({
            name: testName,
            status: 'fail',
            error: `code=${code} msg=${msg}`.slice(0, 60),
          });
        }
      } catch {
        ws.close();
        resolve({
          name: testName,
          status: 'fail',
          error: `Parse error: ${responseData.slice(0, 50)}`,
        });
      }
    };

    ws.onerror = (err) => {
      clearTimeout(timeout);
      log(`[${envName}] Manual WS error (${formatLabel}): ${JSON.stringify(err)}`);
      ws.close();
      resolve({ name: testName, status: 'fail', error: 'WebSocket error' });
    };

    ws.onclose = () => {
      clearTimeout(timeout);
    };
  });

/**
 * Test full WebSocket flow: auth + subscribe to data + receive updates.
 * This verifies the connection actually works for real-time data.
 */
const testManualWebSocketWithSubscription = (
  wsUrl: string,
  tokenArg: string,
  _walletAddress: string,
  log: (msg: string) => void,
  envName: string,
): Promise<TestResult> => new Promise((resolve) => {
    const testName = '5. WS Auth + Subscribe';
    const ws = new WebSocket(wsUrl);
    let authSucceeded = false;
    let dataReceived = false;
    const timeout = setTimeout(() => {
      ws.close();
      if (authSucceeded && !dataReceived) {
        resolve({ name: testName, status: 'fail', error: 'Auth OK but no data received (10s)' });
      } else {
        resolve({ name: testName, status: 'fail', error: 'Timeout (10s)' });
      }
    }, 10000);

    ws.onopen = () => {
      log(`[${envName}] WS+Sub: Connected, sending signin...`);
      ws.send(JSON.stringify({ request: 'signin', args: tokenArg }));
    };

    ws.onmessage = (event) => {
      const responseData = typeof event.data === 'string' ? event.data : String(event.data);
      log(`[${envName}] WS+Sub response: ${responseData.slice(0, 200)}`);

      try {
        const response = JSON.parse(responseData);

        // Handle signin response
        if (response.type === 'signin') {
          const code = response?.data?.code ?? response?.code;
          if (code === 0 || code === 9200) {
            authSucceeded = true;
            log(`[${envName}] WS+Sub: Auth succeeded, subscribing to data...`);
            // MYX SDK uses 'subv2' format with subscription IDs
            // Subscribe to position updates (private) and ticker (public)
            ws.send(JSON.stringify({
              request: 'subv2',
              args: ['position', 'order', 'ticker.*'],
            }));
          } else {
            clearTimeout(timeout);
            ws.close();
            resolve({ name: testName, status: 'fail', error: `Auth failed: code=${code}` });
          }
          return;
        }

        // Handle subv2 acknowledgment
        if (response.type === 'subv2') {
          const code = response?.data?.code ?? response?.code;
          log(`[${envName}] WS+Sub: subv2 ack code=${code}`);
          if (code === 0 || code === 9200) {
            // Subscription accepted, wait for actual data
            return;
          }
          // Subscription failed
          clearTimeout(timeout);
          ws.close();
          resolve({ name: testName, status: 'fail', error: `Subscribe failed: code=${code}` });
          return;
        }

        // Handle actual data (ticker, position, order updates)
        if (response.type?.startsWith('ticker') || response.type === 'position' || response.type === 'order') {
          dataReceived = true;
          clearTimeout(timeout);
          ws.close();
          resolve({
            name: testName,
            status: 'pass',
            details: `Auth + ${response.type} data received!`,
          });
          return;
        }

        // Handle any other data response
        if (response.data && !response.type?.includes('signin') && !response.type?.includes('sub')) {
          dataReceived = true;
          clearTimeout(timeout);
          ws.close();
          resolve({
            name: testName,
            status: 'pass',
            details: `Auth + data received: ${response.type || 'unknown'}`,
          });
        }
      } catch {
        // Non-JSON message, might be binary data
        dataReceived = true;
        clearTimeout(timeout);
        ws.close();
        resolve({
          name: testName,
          status: 'pass',
          details: 'Auth + binary data received',
        });
      }
    };

    ws.onerror = (err) => {
      clearTimeout(timeout);
      log(`[${envName}] WS+Sub error: ${JSON.stringify(err)}`);
      ws.close();
      resolve({ name: testName, status: 'fail', error: 'WebSocket error' });
    };

    ws.onclose = () => {
      clearTimeout(timeout);
    };
  });

const MYXAuthDebug: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const { colors } = useTheme();
  const [isTestnet, setIsTestnet] = useState(true);
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<string>('');

  const log = useCallback((msg: string) => {
    // eslint-disable-next-line no-console
    console.log(`[MYX-DIAG] ${msg}`);
  }, []);

  const runTests = useCallback(async (testnet: boolean) => {
    const env = getEnvConfig(testnet);
    const envName = testnet ? 'Testnet' : 'Mainnet';
    const testResults: TestResult[] = [];

    const account = Engine.context.AccountsController?.getSelectedAccount?.();
    const address = account?.address;
    if (!address) {
      return [{ name: 'Wallet', status: 'fail' as const, error: 'No wallet connected' }];
    }

    // Test 1: Token API
    let token = '';
    let expireAt = 0;
    try {
      const appId = 'metamask';
      const secret = 'vcVSelUYUfcepmOKGemyfC0dcxQDhCg1';
      const timestamp = Math.floor(Date.now() / 1000);
      const expireTime = 3600;
      const payload = `${appId}&${timestamp}&${expireTime}&${address}&${secret}`;
      const signature = Crypto.createHash('sha256').update(payload).digest('hex');
      const url = `${env.tokenApi}?appId=${appId}&timestamp=${timestamp}&expireTime=${expireTime}&allowAccount=${address}&signature=${signature}`;

      log(`[${envName}] Token API: ${url}`);
      const response = await fetch(url);
      const result = await response.json();
      log(`[${envName}] Token Response: ${JSON.stringify(result)}`);

      if (result.data?.accessToken) {
        token = result.data.accessToken;
        expireAt = result.data.expireAt;
        testResults.push({
          name: '1. Token API',
          status: 'pass',
          details: `Token: ${token.slice(0, 12)}...`,
        });
      } else {
        testResults.push({
          name: '1. Token API',
          status: 'fail',
          error: JSON.stringify(result).slice(0, 80),
        });
        return testResults;
      }
    } catch (err) {
      testResults.push({ name: '1. Token API', status: 'fail', error: String(err) });
      return testResults;
    }

    // Test 2: HTTP Private Endpoint
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let client: any;
    try {
      client = new MyxClient({
        chainId: env.chainId,
        brokerAddress: getMYXBrokerAddress(env.isTestnet),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signer: { getAddress: async () => address, signMessage: async () => '0x', signTypedData: async () => '0x' } as any,
        isTestnet: env.isTestnet,
        isBetaMode: env.isBetaMode,
        getAccessToken: async () => ({ accessToken: token, expireAt }),
      });

      const positions = await client.position.listPositions(address);
      log(`[${envName}] listPositions: ${JSON.stringify(positions)}`);

      if (positions?.code === 0 || Array.isArray(positions)) {
        testResults.push({ name: '2. HTTP listPositions', status: 'pass', details: 'code=0' });
      } else {
        testResults.push({
          name: '2. HTTP listPositions',
          status: 'fail',
          error: JSON.stringify(positions).slice(0, 80),
        });
      }
    } catch (err) {
      testResults.push({ name: '2. HTTP listPositions', status: 'fail', error: String(err) });
    }

    // Test 3: WebSocket Connect
    if (client) {
      try {
        const sub = client.subscription;
        client.getConfigManager().clearAccessToken();

        if (!sub.isConnected) {
          sub.connect();
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout (5s)')), 5000);
            sub.on('open', () => { clearTimeout(timeout); resolve(); });
            sub.on('error', (err: Error) => { clearTimeout(timeout); reject(err); });
          });
        }
        testResults.push({ name: '3. WS Connect', status: 'pass', details: env.wsUrl });

        // Test 4a: SDK WebSocket Auth (uses sdk.{token} format internally)
        try {
          log(`[${envName}] SDK WS auth - will send: sdk.${token.slice(0, 12)}...`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (sub as any).auth();
          testResults.push({ name: '4a. SDK WS Auth', status: 'pass', details: 'SDK auth successful' });
        } catch (authErr) {
          const errorMsg = String(authErr);
          testResults.push({
            name: '4a. SDK WS Auth',
            status: 'fail',
            error: errorMsg.includes('9401') ? '9401 Unauthorized' : errorMsg.slice(0, 80),
          });
        }
      } catch (connErr) {
        testResults.push({ name: '3. WS Connect', status: 'fail', error: String(connErr) });
      }
    }

    // Test 4b: Manual WS Auth with RAW token (bypass SDK)
    // Run BEFORE SDK test to see if fresh connection works
    try {
      log(`[${envName}] Manual WS test - raw token format...`);
      const rawTokenResult = await testManualWebSocketAuth(env.wsUrl, token, 'raw', log, envName);
      testResults.push(rawTokenResult);
    } catch (err) {
      testResults.push({ name: '4b. Manual WS (raw)', status: 'fail', error: String(err).slice(0, 80) });
    }

    // Test 4c: Manual WS Auth with sdk.{token} format
    try {
      log(`[${envName}] Manual WS test - sdk.{token} format...`);
      const sdkTokenResult = await testManualWebSocketAuth(env.wsUrl, `sdk.${token}`, 'sdk.', log, envName);
      testResults.push(sdkTokenResult);
    } catch (err) {
      testResults.push({ name: '4c. Manual WS (sdk.)', status: 'fail', error: String(err).slice(0, 80) });
    }

    // Test 4d: Manual WS with FRESH token (new token request + new WebSocket)
    // Tests if existing token was invalidated by previous connections
    try {
      log(`[${envName}] Manual WS test - fresh token...`);
      const freshToken = await fetchFreshToken(env.tokenApi, address, log, envName);
      if (freshToken) {
        const freshResult = await testManualWebSocketAuth(env.wsUrl, `sdk.${freshToken}`, 'fresh', log, envName);
        testResults.push({ ...freshResult, name: '4d. Manual WS (fresh token)' });
      } else {
        testResults.push({ name: '4d. Manual WS (fresh token)', status: 'fail', error: 'Failed to get fresh token' });
      }
    } catch (err) {
      testResults.push({ name: '4d. Manual WS (fresh token)', status: 'fail', error: String(err).slice(0, 80) });
    }

    // Test 5: Full WebSocket flow - auth + subscribe + receive data
    // This verifies the connection actually works for real-time updates
    try {
      log(`[${envName}] Testing full WS flow: auth + subscribe...`);
      const freshToken = await fetchFreshToken(env.tokenApi, address, log, envName);
      if (freshToken) {
        const fullFlowResult = await testManualWebSocketWithSubscription(
          env.wsUrl,
          `sdk.${freshToken}`,
          address,
          log,
          envName,
        );
        testResults.push(fullFlowResult);
      } else {
        testResults.push({ name: '5. WS Auth + Subscribe', status: 'fail', error: 'Failed to get token' });
      }
    } catch (err) {
      testResults.push({ name: '5. WS Auth + Subscribe', status: 'fail', error: String(err).slice(0, 80) });
    }

    return testResults;
  }, [log]);

  const runDiagnostics = useCallback(async () => {
    setIsRunning(true);
    setSummary('');
    const envName = isTestnet ? 'Testnet' : 'Mainnet';
    setResults([{ name: `Running ${envName} tests...`, status: 'running' }]);

    const testResults = await runTests(isTestnet);
    setResults(testResults);

    const passed = testResults.filter(r => r.status === 'pass').length;
    const failed = testResults.filter(r => r.status === 'fail').length;
    setSummary(`${envName}: ${passed} passed, ${failed} failed`);

    setIsRunning(false);
  }, [isTestnet, runTests]);

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return colors.success.default;
      case 'fail': return colors.error.default;
      case 'running': return colors.warning.default;
      default: return colors.text.muted;
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'running': return '⏳';
      default: return '⬚';
    }
  };

  if (!__DEV__) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <Text variant={TextVariant.BodyMD}>Only available in dev builds</Text>
      </SafeAreaView>
    );
  }

  const envConfig = getEnvConfig(isTestnet);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text variant={TextVariant.HeadingMD}>MYX Auth Diagnostics</Text>
          <Text variant={TextVariant.BodySM} style={styles.subtitle}>
            Toggle environment and run all 4 tests in sequence
          </Text>
        </View>

        {/* Environment Toggle */}
        <View style={styles.section}>
          <Text variant={TextVariant.BodySM} style={styles.subtitle}>
            Environment:
          </Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, isTestnet && styles.toggleActive]}
              onPress={() => setIsTestnet(true)}
              disabled={isRunning}
            >
              <Text
                variant={TextVariant.BodyMD}
                style={isTestnet ? styles.toggleTextActive : styles.toggleText}
              >
                Testnet
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, !isTestnet && styles.toggleActive]}
              onPress={() => setIsTestnet(false)}
              disabled={isRunning}
            >
              <Text
                variant={TextVariant.BodyMD}
                style={!isTestnet ? styles.toggleTextActive : styles.toggleText}
              >
                Mainnet
              </Text>
            </TouchableOpacity>
          </View>
          <Text variant={TextVariant.BodyXS} style={styles.subtitle}>
            Chain: {envConfig.chainId} | Beta: {String(envConfig.isBetaMode)}
          </Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, isRunning && styles.buttonDisabled]}
            onPress={runDiagnostics}
            disabled={isRunning}
          >
            {isRunning ? (
              <ActivityIndicator color={colors.primary.inverse} />
            ) : (
              <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
                Run Diagnostics
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {results.length > 0 && (
          <View style={styles.logsSection}>
            <Text variant={TextVariant.BodyMD} style={styles.logsTitle}>
              Test Results
            </Text>
            <View style={styles.logsContainer}>
              {results.map((result, i) => (
                <View key={i} style={styles.logEntry}>
                  <Text
                    variant={TextVariant.BodySM}
                    style={[styles.logText, { color: getStatusColor(result.status) }]}
                  >
                    {getStatusIcon(result.status)} {result.name}
                  </Text>
                  {result.details && (
                    <Text variant={TextVariant.BodyXS} style={[styles.logText, { color: colors.text.muted }]}>
                      {'  '}{result.details}
                    </Text>
                  )}
                  {result.error && (
                    <Text variant={TextVariant.BodyXS} style={[styles.logText, { color: colors.error.default }]}>
                      {'  '}Error: {result.error}
                    </Text>
                  )}
                </View>
              ))}

              {summary && (
                <View style={styles.section}>
                  <Text variant={TextVariant.BodyMD}>
                    {summary}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text variant={TextVariant.BodyXS} style={styles.subtitle}>
            Testnet: chainId=97, isBetaMode=true, api-beta endpoints{'\n'}
            Mainnet: chainId=56, isBetaMode=false, api endpoints{'\n'}
            Tests: Token API → HTTP → WS Connect → SDK Auth → Manual Auth (raw/sdk.)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MYXAuthDebug;
