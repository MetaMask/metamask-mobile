/**
 * MYXServiceDebug - Compare MYXClientService auth with standalone SDK
 *
 * This debug page tests the actual MYXClientService code path and compares
 * it with standalone SDK behavior to identify authentication issues.
 *
 * Tests:
 * 1. Token API - Direct API call for token
 * 2. Service Init - MYXClientService.initialize()
 * 3. Service WS Auth - service.connectAndAuthenticateWebSocket()
 * 4. Standalone SDK - Fresh MyxClient (same as MYXAuthDebug)
 * 5. Manual WS - Direct WebSocket with sdk.{token}
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MyxClient } from '@myx-trade/sdk';
import Crypto from 'react-native-quick-crypto';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import { useTheme } from '../../../../util/theme';
import Engine from '../../../../core/Engine';
import { getMYXBrokerAddress } from '../constants/myxConfig';
import {
  MYXClientService,
  MYXConnectionState,
  type MYXSignerAdapter,
} from '../services/MYXClientService';
import type { IPerpsPlatformDependencies } from '../controllers/types';
import styleSheet from './MYXAuthDebug.styles';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'pass' | 'fail';
  details?: string;
  error?: string;
  source?: 'service' | 'standalone';
}

interface LogEntry {
  timestamp: string;
  source: 'service' | 'standalone' | 'test';
  message: string;
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

const MYX_AUTH_CONFIG = {
  appId: 'metamask',
  secret: 'vcVSelUYUfcepmOKGemyfC0dcxQDhCg1',
  defaultExpireTime: 3600,
};

/**
 * Create mock platform dependencies for testing MYXClientService
 */
const createMockDeps = (
  logCallback: (entry: LogEntry) => void,
): IPerpsPlatformDependencies => {
  const log = (source: 'service' | 'standalone', message: string) => {
    logCallback({
      timestamp: new Date().toISOString().slice(11, 19),
      source,
      message,
    });
  };

  return {
    logger: {
      error: (error: Error, context?: unknown) => {
        log('service', `ERROR: ${error.message} ${JSON.stringify(context)}`);
      },
    },
    debugLogger: {
      log: (message: string, data?: unknown) => {
        log('service', `${message} ${data ? JSON.stringify(data) : ''}`);
      },
    },
    metrics: {
      trackEvent: () => undefined,
      incrementCounter: () => undefined,
      setGauge: () => undefined,
      recordTiming: () => undefined,
    },
    performance: {
      startSpan: () => ({
        end: () => undefined,
        setStatus: () => undefined,
        setAttributes: () => undefined,
      }),
    },
    tracer: {
      startSpan: () => ({
        end: () => undefined,
        setStatus: () => undefined,
        setAttributes: () => undefined,
      }),
    },
    streamManager: {
      subscribe: () => () => undefined,
      unsubscribe: () => undefined,
      getState: () => ({}),
    },
    controllers: {
      getAccountsController: () => Engine.context.AccountsController,
      getKeyringController: () => Engine.context.KeyringController,
      getPreferencesController: () => Engine.context.PreferencesController,
      getNetworkController: () => Engine.context.NetworkController,
      getCurrencyRateController: () => Engine.context.CurrencyRateController,
      getTokenRatesController: () => Engine.context.TokenRatesController,
    },
  } as unknown as IPerpsPlatformDependencies;
};

/**
 * Create signer adapter from wallet
 */
const createSignerAdapter = (address: string): MYXSignerAdapter => ({
  getAddress: async () => address,
  signMessage: async (message: string | Uint8Array) => {
    const messageStr =
      typeof message === 'string' ? message : new TextDecoder().decode(message);
    const result = await Engine.context.KeyringController.signMessage({
      from: address,
      data: messageStr,
    });
    return result as string;
  },
  signTypedData: async (
    domain: Record<string, unknown>,
    types: Record<string, unknown[]>,
    value: Record<string, unknown>,
  ) => {
    const result = await Engine.context.KeyringController.signTypedMessage(
      {
        from: address,
        data: JSON.stringify({
          types: { EIP712Domain: [], ...types },
          primaryType: Object.keys(types)[0],
          domain,
          message: value,
        }),
      },
      SignTypedDataVersion.V4,
    );
    return result as string;
  },
});

/**
 * Fetch token directly from MYX API
 */
const fetchToken = async (
  tokenApi: string,
  address: string,
): Promise<{ accessToken: string; expireAt: number } | null> => {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${MYX_AUTH_CONFIG.appId}&${timestamp}&${MYX_AUTH_CONFIG.defaultExpireTime}&${address}&${MYX_AUTH_CONFIG.secret}`;
  const signature = Crypto.createHash('sha256').update(payload).digest('hex');
  const url = `${tokenApi}?appId=${MYX_AUTH_CONFIG.appId}&timestamp=${timestamp}&expireTime=${MYX_AUTH_CONFIG.defaultExpireTime}&allowAccount=${address}&signature=${signature}`;

  const response = await fetch(url);
  const result = await response.json();

  if (result.data?.accessToken) {
    return {
      accessToken: result.data.accessToken,
      expireAt: result.data.expireAt,
    };
  }
  return null;
};

/**
 * Manual WebSocket auth test
 */
const testManualWebSocketAuth = (
  wsUrl: string,
  token: string,
  log: (msg: string) => void,
): Promise<{ success: boolean; error?: string }> =>
  new Promise((resolve) => {
    const ws = new WebSocket(wsUrl);
    const timeout = setTimeout(() => {
      ws.close();
      resolve({ success: false, error: 'Timeout (8s)' });
    }, 8000);

    ws.onopen = () => {
      log(`Manual WS connected, sending signin with sdk.{token}`);
      ws.send(JSON.stringify({ request: 'signin', args: `sdk.${token}` }));
    };

    ws.onmessage = (event) => {
      clearTimeout(timeout);
      const responseData =
        typeof event.data === 'string' ? event.data : String(event.data);
      log(`Manual WS response: ${responseData.slice(0, 100)}`);

      try {
        const response = JSON.parse(responseData);
        const code = response?.data?.code ?? response?.code;
        if (code === 0 || code === 9200) {
          ws.close();
          resolve({ success: true });
        } else {
          ws.close();
          resolve({ success: false, error: `code=${code}` });
        }
      } catch {
        ws.close();
        resolve({ success: false, error: 'Parse error' });
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      ws.close();
      resolve({ success: false, error: 'WebSocket error' });
    };

    ws.onclose = () => {
      clearTimeout(timeout);
    };
  });

const MYXServiceDebug: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const { colors } = useTheme();
  const [isTestnet, setIsTestnet] = useState(true);
  const [results, setResults] = useState<TestResult[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [tokenCallbackCount, setTokenCallbackCount] = useState(0);
  const serviceRef = useRef<MYXClientService | null>(null);

  // Cleanup on unmount - prevent background task leaks (health checks, timeouts)
  useEffect(
    () => () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect().catch(() => {
          // Ignore cleanup errors on unmount
        });
        serviceRef.current = null;
      }
    },
    [],
  );

  const addLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => [...prev, entry]);
    // eslint-disable-next-line no-console
    console.log(`[MYX-SVC-DEBUG] [${entry.source}] ${entry.message}`);
  }, []);

  const testLog = useCallback(
    (message: string) => {
      addLog({ timestamp: new Date().toISOString().slice(11, 19), source: 'test', message });
    },
    [addLog],
  );

  const runTests = useCallback(async () => {
    const env = getEnvConfig(isTestnet);
    const envName = isTestnet ? 'Testnet' : 'Mainnet';
    const testResults: TestResult[] = [];

    setLogs([]);
    setTokenCallbackCount(0);

    const account = Engine.context.AccountsController?.getSelectedAccount?.();
    const address = account?.address;
    if (!address) {
      return [
        {
          name: 'Wallet',
          status: 'fail' as const,
          error: 'No wallet connected',
        },
      ];
    }

    testLog(`Starting ${envName} tests for ${address.slice(0, 10)}...`);
    testLog(`Config: chainId=${env.chainId}, isBetaMode=${env.isBetaMode}`);

    // Test 1: Token API (same for both)
    let token: { accessToken: string; expireAt: number } | null = null;
    try {
      testLog('Test 1: Fetching token from API...');
      token = await fetchToken(env.tokenApi, address);
      if (token) {
        testResults.push({
          name: '1. Token API',
          status: 'pass',
          details: `Token: ${token.accessToken.slice(0, 12)}...`,
        });
        testLog(`Token received: ${token.accessToken.slice(0, 12)}...`);
      } else {
        testResults.push({
          name: '1. Token API',
          status: 'fail',
          error: 'No token returned',
        });
        return testResults;
      }
    } catch (e) {
      testResults.push({
        name: '1. Token API',
        status: 'fail',
        error: String(e),
      });
      return testResults;
    }

    // Test 2: MYXClientService initialization
    testLog('Test 2: Initializing MYXClientService...');
    let callbackInvocations = 0;
    const mockDeps = createMockDeps((entry) => {
      addLog(entry);
      if (entry.message.includes('generateAccessToken called')) {
        callbackInvocations++;
        setTokenCallbackCount(callbackInvocations);
      }
    });

    try {
      const service = new MYXClientService(mockDeps, { isTestnet });
      serviceRef.current = service;

      const signer = createSignerAdapter(address);
      await service.initialize(signer);

      const state = service.getConnectionState();
      testLog(`Service state: ${state}`);

      if (state === MYXConnectionState.CONNECTED && service.isInitialized()) {
        testResults.push({
          name: '2. Service Init',
          status: 'pass',
          details: `State: ${state}`,
          source: 'service',
        });
      } else {
        testResults.push({
          name: '2. Service Init',
          status: 'fail',
          error: `State: ${state}`,
          source: 'service',
        });
      }
    } catch (e) {
      testResults.push({
        name: '2. Service Init',
        status: 'fail',
        error: String(e).slice(0, 80),
        source: 'service',
      });
    }

    // Test 3: Service WS Auth (already done in initialize, check result)
    testLog('Test 3: Checking service WebSocket auth result...');
    if (serviceRef.current) {
      const isConnected = serviceRef.current.getConnectionState() === MYXConnectionState.CONNECTED;
      testResults.push({
        name: '3. Service WS Auth',
        status: isConnected ? 'pass' : 'fail',
        details: isConnected ? 'WebSocket authenticated' : undefined,
        error: isConnected ? undefined : 'Not connected',
        source: 'service',
      });

      // Test 3b: Load private data to confirm auth works
      if (isConnected) {
        testLog('Test 3b: Loading private data (positions, orders, account)...');
        try {
          const [positions, orders, pools] = await Promise.all([
            serviceRef.current.getPositions(address),
            serviceRef.current.getOpenOrders(address),
            serviceRef.current.getPools(),
          ]);

          // Get account info for first pool if we have positions, otherwise use default pool
          let accountInfo = null;
          let usedPoolId = '';
          if (pools.length > 0) {
            usedPoolId = positions.length > 0 ? positions[0].poolId : pools[0].poolId;
            accountInfo = await serviceRef.current.getAccountInfo(address, usedPoolId);
          }

          testLog(`Positions loaded: ${positions.length}`);
          testLog(`Orders loaded: ${orders.length}`);
          testLog(`Pools available: ${pools.length}`);
          testLog(`Account info: ${accountInfo ? `loaded (pool: ${usedPoolId})` : pools.length > 0 ? 'null response' : 'no pools'}`);

          // Log details to console for inspection
          // eslint-disable-next-line no-console
          console.log('[MYX-SVC-DEBUG] Positions:', JSON.stringify(positions, null, 2));
          // eslint-disable-next-line no-console
          console.log('[MYX-SVC-DEBUG] Orders:', JSON.stringify(orders, null, 2));
          // eslint-disable-next-line no-console
          console.log('[MYX-SVC-DEBUG] Account:', JSON.stringify(accountInfo, null, 2));
          // eslint-disable-next-line no-console
          console.log('[MYX-SVC-DEBUG] Pools:', JSON.stringify(pools, null, 2));

          testResults.push({
            name: '3b. Load Private Data',
            status: 'pass',
            details: `Positions: ${positions.length}, Orders: ${orders.length}, Pools: ${pools.length}`,
            source: 'service',
          });

          // Test 3c: GlobalId resolution for WebSocket subscriptions
          testLog('Test 3c: Testing globalId resolution for subscriptions...');
          const globalIdResults: { symbol: string; globalId: number | undefined }[] = [];
          const service = serviceRef.current;
          for (const pool of pools) {
            const globalId = service ? await service.getGlobalIdForSymbol(pool.baseSymbol) : undefined;
            globalIdResults.push({ symbol: pool.baseSymbol, globalId });
            testLog(`  ${pool.baseSymbol} -> globalId: ${globalId ?? 'undefined'}`);
          }

          // eslint-disable-next-line no-console
          console.log('[MYX-SVC-DEBUG] GlobalId Results:', JSON.stringify(globalIdResults, null, 2));

          const resolvedCount = globalIdResults.filter(r => r.globalId !== undefined).length;
          const totalCount = globalIdResults.length;

          testResults.push({
            name: '3c. GlobalId Resolution',
            status: resolvedCount === totalCount ? 'pass' : (resolvedCount > 0 ? 'pass' : 'fail'),
            details: `${resolvedCount}/${totalCount} symbols resolved`,
            source: 'service',
          });

        } catch (e) {
          testLog(`Private data load error: ${String(e)}`);
          testResults.push({
            name: '3b. Load Private Data',
            status: 'fail',
            error: String(e).slice(0, 80),
            source: 'service',
          });
        }
      }
    } else {
      testResults.push({
        name: '3. Service WS Auth',
        status: 'fail',
        error: 'Service not initialized',
        source: 'service',
      });
    }

    // Test 4: Standalone SDK (same approach as MYXAuthDebug)
    testLog('Test 4: Testing standalone SDK...');
    let standaloneClient: MyxClient | null = null;
    try {
      // Fetch fresh token for standalone test
      const standaloneToken = await fetchToken(env.tokenApi, address);
      if (!standaloneToken) {
        testResults.push({
          name: '4. Standalone SDK',
          status: 'fail',
          error: 'Failed to get token',
          source: 'standalone',
        });
      } else {
        testLog(`Standalone token: ${standaloneToken.accessToken.slice(0, 12)}...`);

        standaloneClient = new MyxClient({
          chainId: env.chainId,
          brokerAddress: getMYXBrokerAddress(env.isTestnet),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          signer: createSignerAdapter(address) as any,
          isTestnet: env.isTestnet,
          isBetaMode: env.isBetaMode,
          getAccessToken: async () => standaloneToken,
        });

        const sub = standaloneClient.subscription;
        standaloneClient.getConfigManager().clearAccessToken();

        if (!sub.isConnected) {
          sub.connect();
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(
              () => reject(new Error('Connection timeout')),
              5000,
            );
            sub.on('open', () => {
              clearTimeout(timeout);
              resolve();
            });
            sub.on('error', (err: unknown) => {
              clearTimeout(timeout);
              reject(err instanceof Error ? err : new Error(String(err)));
            });
          });
        }

        testLog('Standalone SDK connected, authenticating...');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (sub as any).auth();

        testResults.push({
          name: '4. Standalone SDK',
          status: 'pass',
          details: 'SDK auth successful',
          source: 'standalone',
        });
        testLog('Standalone SDK auth succeeded!');
      }
    } catch (e) {
      const errorMsg = String(e);
      testResults.push({
        name: '4. Standalone SDK',
        status: 'fail',
        error: errorMsg.includes('9401')
          ? '9401 Unauthorized'
          : errorMsg.slice(0, 80),
        source: 'standalone',
      });
      testLog(`Standalone SDK error: ${errorMsg}`);
    }

    // Test 5: Manual WebSocket auth (fresh token, bypasses SDK)
    testLog('Test 5: Testing manual WebSocket auth...');
    try {
      const manualToken = await fetchToken(env.tokenApi, address);
      if (manualToken) {
        const result = await testManualWebSocketAuth(
          env.wsUrl,
          manualToken.accessToken,
          testLog,
        );
        testResults.push({
          name: '5. Manual WS Auth',
          status: result.success ? 'pass' : 'fail',
          details: result.success ? 'Manual auth successful' : undefined,
          error: result.error,
        });
      } else {
        testResults.push({
          name: '5. Manual WS Auth',
          status: 'fail',
          error: 'Failed to get token',
        });
      }
    } catch (e) {
      testResults.push({
        name: '5. Manual WS Auth',
        status: 'fail',
        error: String(e).slice(0, 80),
      });
    }

    // Cleanup
    if (serviceRef.current) {
      try {
        await serviceRef.current.disconnect();
      } catch {
        // Ignore cleanup errors
      }
      serviceRef.current = null;
    }

    testLog(
      `Tests complete. Token callback invocations: ${callbackInvocations}`,
    );

    return testResults;
  }, [isTestnet, addLog, testLog]);

  const runDiagnostics = useCallback(async () => {
    setIsRunning(true);
    const envName = isTestnet ? 'Testnet' : 'Mainnet';
    setResults([{ name: `Running ${envName} tests...`, status: 'running' }]);

    const testResults = await runTests();
    setResults(testResults);

    setIsRunning(false);
  }, [isTestnet, runTests]);

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return colors.success.default;
      case 'fail':
        return colors.error.default;
      case 'running':
        return colors.warning.default;
      default:
        return colors.text.muted;
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return '✅';
      case 'fail':
        return '❌';
      case 'running':
        return '⏳';
      default:
        return '⬚';
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
  const serviceResults = results.filter((r) => r.source === 'service');
  const standaloneResults = results.filter((r) => r.source === 'standalone');
  const otherResults = results.filter((r) => !r.source);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text variant={TextVariant.HeadingMD}>MYX Service Debug</Text>
          <Text variant={TextVariant.BodySM} style={styles.subtitle}>
            Compare MYXClientService with standalone SDK
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
            Chain: {envConfig.chainId} | isBetaMode: {String(envConfig.isBetaMode)}
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
                Run Comparison Tests
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Token Callback Counter */}
        {tokenCallbackCount > 0 && (
          <View style={styles.section}>
            <Text variant={TextVariant.BodySM}>
              Token callback invocations: {tokenCallbackCount}
            </Text>
          </View>
        )}

        {/* Results - Side by Side */}
        {results.length > 0 && (
          <View style={styles.logsSection}>
            <Text variant={TextVariant.BodyMD} style={styles.logsTitle}>
              Test Results
            </Text>
            <View style={styles.logsContainer}>
              {/* Common tests (Token API, Manual WS) */}
              {otherResults.map((result, i) => (
                <View key={`other-${i}`} style={styles.logEntry}>
                  <Text
                    variant={TextVariant.BodySM}
                    style={[
                      styles.logText,
                      { color: getStatusColor(result.status) },
                    ]}
                  >
                    {getStatusIcon(result.status)} {result.name}
                  </Text>
                  {result.details && (
                    <Text
                      variant={TextVariant.BodyXS}
                      style={[styles.logText, { color: colors.text.muted }]}
                    >
                      {'  '}
                      {result.details}
                    </Text>
                  )}
                  {result.error && (
                    <Text
                      variant={TextVariant.BodyXS}
                      style={[styles.logText, { color: colors.error.default }]}
                    >
                      {'  '}Error: {result.error}
                    </Text>
                  )}
                </View>
              ))}

              {/* Service Results */}
              {serviceResults.length > 0 && (
                <>
                  <Text
                    variant={TextVariant.BodySM}
                    style={[styles.logText, styles.groupHeader]}
                  >
                    MYXClientService:
                  </Text>
                  {serviceResults.map((result, i) => (
                    <View key={`service-${i}`} style={styles.logEntry}>
                      <Text
                        variant={TextVariant.BodySM}
                        style={[
                          styles.logText,
                          { color: getStatusColor(result.status) },
                        ]}
                      >
                        {getStatusIcon(result.status)} {result.name}
                      </Text>
                      {result.details && (
                        <Text
                          variant={TextVariant.BodyXS}
                          style={[styles.logText, { color: colors.text.muted }]}
                        >
                          {'  '}
                          {result.details}
                        </Text>
                      )}
                      {result.error && (
                        <Text
                          variant={TextVariant.BodyXS}
                          style={[
                            styles.logText,
                            { color: colors.error.default },
                          ]}
                        >
                          {'  '}Error: {result.error}
                        </Text>
                      )}
                    </View>
                  ))}
                </>
              )}

              {/* Standalone Results */}
              {standaloneResults.length > 0 && (
                <>
                  <Text
                    variant={TextVariant.BodySM}
                    style={[styles.logText, styles.groupHeader]}
                  >
                    Standalone SDK:
                  </Text>
                  {standaloneResults.map((result, i) => (
                    <View key={`standalone-${i}`} style={styles.logEntry}>
                      <Text
                        variant={TextVariant.BodySM}
                        style={[
                          styles.logText,
                          { color: getStatusColor(result.status) },
                        ]}
                      >
                        {getStatusIcon(result.status)} {result.name}
                      </Text>
                      {result.details && (
                        <Text
                          variant={TextVariant.BodyXS}
                          style={[styles.logText, { color: colors.text.muted }]}
                        >
                          {'  '}
                          {result.details}
                        </Text>
                      )}
                      {result.error && (
                        <Text
                          variant={TextVariant.BodyXS}
                          style={[
                            styles.logText,
                            { color: colors.error.default },
                          ]}
                        >
                          {'  '}Error: {result.error}
                        </Text>
                      )}
                    </View>
                  ))}
                </>
              )}
            </View>
          </View>
        )}

        {/* Debug Logs */}
        {logs.length > 0 && (
          <View style={styles.logsSection}>
            <Text variant={TextVariant.BodyMD} style={styles.logsTitle}>
              Debug Logs ({logs.length})
            </Text>
            <View style={styles.logsContainer}>
              {logs.slice(-30).map((log, i) => (
                <Text
                  key={i}
                  variant={TextVariant.BodyXS}
                  style={[
                    styles.logText,
                    {
                      color:
                        log.source === 'service'
                          ? colors.primary.default
                          : log.source === 'standalone'
                            ? colors.success.default
                            : colors.text.muted,
                    },
                  ]}
                >
                  [{log.timestamp}] [{log.source}] {log.message}
                </Text>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text variant={TextVariant.BodyXS} style={styles.subtitle}>
            Tests compare MYXClientService code path with standalone SDK.
            {'\n'}
            Service uses: isTestnet={String(envConfig.isTestnet)}, isBetaMode=
            {String(envConfig.isBetaMode)}
            {'\n'}
            Token callback count shows how often generateAccessToken is called.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MYXServiceDebug;
