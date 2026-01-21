/**
 * MYXAuthDebug
 *
 * Multi-format debug component to test MYX WebSocket authentication and HTTP API.
 * Tests different token formats to find which one works.
 *
 * Purpose: Debug 9401 Unauthorized error by trying multiple authentication
 * token formats and reporting which one succeeds. Also validates HTTP API
 * works independently of WebSocket auth.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MyxClient } from '@myx-trade/sdk';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import { useTheme } from '../../../../util/theme';
import Engine from '../../../../core/Engine';
import { getMYXChainId, getMYXBrokerAddress } from '../constants/myxConfig';
import styleSheet from './MYXAuthDebug.styles';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warn';
}

interface TokenFormat {
  id: number;
  name: string;
  desc: string;
}

const TOKEN_FORMATS: TokenFormat[] = [
  {
    id: 1,
    name: 'Raw Signature',
    desc: 'Personal sign of custom message (current)',
  },
  { id: 2, name: 'Address Only', desc: 'Just the wallet address as token' },
  {
    id: 3,
    name: 'Timestamp:Address',
    desc: 'Colon-separated timestamp and address',
  },
  {
    id: 4,
    name: 'JSON Payload',
    desc: 'JSON object with address and timestamp',
  },
  { id: 5, name: 'Base64 JSON', desc: 'Base64 encoded JSON payload' },
  {
    id: 6,
    name: 'Address:Timestamp:Sig',
    desc: 'Combined address, timestamp, and signature',
  },
  { id: 7, name: 'No Token', desc: 'Return undefined/empty' },
];

type TestMode = 'auth' | 'http';

const MYXAuthDebug: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const { colors } = useTheme();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [useTestnet, setUseTestnet] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState<number>(1);
  const [testAllMode, setTestAllMode] = useState(false);
  const [testMode, setTestMode] = useState<TestMode>('http');
  const currentFormatRef = useRef<number>(1);

  const addLog = useCallback(
    (message: string, type: LogEntry['type'] = 'info') => {
      const timestamp = new Date().toISOString().slice(11, 23);
      const prefix =
        type === 'error'
          ? '❌'
          : type === 'success'
            ? '✅'
            : type === 'warn'
              ? '⚠️'
              : 'ℹ️';
      // eslint-disable-next-line no-console
      console.log(`[MYX-AUTH-DEBUG] ${prefix} [${timestamp}] ${message}`);
      setLogs((prev) => [...prev, { timestamp, message, type }]);
    },
    [],
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const generateToken = useCallback(
    async (
      formatId: number,
      address: string,
      logFn: (msg: string, type: LogEntry['type']) => void,
    ): Promise<{ accessToken: string; expireAt: number } | undefined> => {
      const timestamp = Date.now();
      const expireAt = timestamp + 30 * 60 * 1000; // 30 minutes

      logFn(
        `Generating token with format ${formatId}: ${TOKEN_FORMATS.find((f) => f.id === formatId)?.name}`,
        'info',
      );

      const signMessage = async (message: string): Promise<string> => {
        const hexMsg = `0x${Buffer.from(message, 'utf8').toString('hex')}`;
        return Engine.context.KeyringController.signPersonalMessage({
          from: address,
          data: hexMsg,
        });
      };

      try {
        let accessToken: string;

        switch (formatId) {
          case 1: {
            const message = `MYX Authentication\nAddress: ${address}\nTimestamp: ${timestamp}\nExpires: ${expireAt}`;
            logFn(`Message to sign:\n${message}`, 'info');
            accessToken = await signMessage(message);
            logFn(`Signature: ${accessToken.slice(0, 30)}...`, 'info');
            break;
          }

          case 2: {
            accessToken = address;
            logFn(`Using address as token: ${accessToken}`, 'info');
            break;
          }

          case 3: {
            accessToken = `${timestamp}:${address}`;
            logFn(`Using timestamp:address: ${accessToken}`, 'info');
            break;
          }

          case 4: {
            accessToken = JSON.stringify({ address, timestamp, expireAt });
            logFn(`Using JSON payload: ${accessToken.slice(0, 50)}...`, 'info');
            break;
          }

          case 5: {
            const jsonPayload = JSON.stringify({
              address,
              timestamp,
              expireAt,
            });
            accessToken = Buffer.from(jsonPayload).toString('base64');
            logFn(`Using Base64 JSON: ${accessToken.slice(0, 40)}...`, 'info');
            break;
          }

          case 6: {
            const message = `${address}:${timestamp}`;
            const signature = await signMessage(message);
            accessToken = `${address}:${timestamp}:${signature}`;
            logFn(
              `Using address:timestamp:sig: ${accessToken.slice(0, 50)}...`,
              'info',
            );
            break;
          }

          case 7: {
            logFn('Returning undefined (no token)', 'info');
            return undefined;
          }

          default:
            logFn(`Unknown format ID: ${formatId}`, 'error');
            return undefined;
        }

        return { accessToken, expireAt };
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logFn(`Token generation error: ${errMsg}`, 'error');
        return undefined;
      }
    },
    [],
  );

  /**
   * Test HTTP API endpoints (no auth required for public endpoints)
   */
  const testHTTPAPI = useCallback(
    async (
      logFn: (msg: string, type: LogEntry['type']) => void,
    ): Promise<boolean> => {
      logFn('\n' + '='.repeat(50), 'warn');
      logFn('Testing MYX HTTP API (Public Endpoints)', 'warn');
      logFn('='.repeat(50), 'warn');

      const evmAccount =
        Engine.context.AccountsController?.getSelectedAccount?.();
      const address = evmAccount?.address;
      logFn(`Account address: ${address || 'Not connected'}`, 'info');

      const chainId = parseInt(getMYXChainId(useTestnet), 10);
      const brokerAddress = getMYXBrokerAddress(useTestnet);
      logFn(
        `Network: ${useTestnet ? 'testnet' : 'mainnet'}, chainId: ${chainId}`,
        'info',
      );

      // Create a minimal signer adapter (only needed for SDK initialization)
      const signerAdapter = {
        getAddress: async () =>
          address || '0x0000000000000000000000000000000000000000',
        signMessage: async () => '0x',
        signTypedData: async () => '0x',
      };

      try {
        const client = new MyxClient({
          chainId,
          ...(brokerAddress !==
            '0x0000000000000000000000000000000000000000' && { brokerAddress }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          signer: signerAdapter as any,
          isTestnet: useTestnet,
          isBetaMode: false,
        });

        let allTestsPassed = true;

        // Test 1: Get Pool Symbols (Public)
        logFn('\n--- Test 1: Get Pool Symbols (Public) ---', 'info');
        try {
          const marketsClient = client.markets;
          const pools = await marketsClient.getPoolSymbolAll();
          if (Array.isArray(pools) && pools.length > 0) {
            logFn(
              `✅ getPoolSymbolAll: Found ${pools.length} pools`,
              'success',
            );
            const samplePools = pools
              .slice(0, 3)
              .map((p) => p.baseSymbol || p.poolId);
            logFn(`   Sample pools: ${samplePools.join(', ')}`, 'info');
          } else {
            logFn(`⚠️ getPoolSymbolAll: Empty or invalid response`, 'warn');
            logFn(
              `   Response: ${JSON.stringify(pools).slice(0, 100)}`,
              'info',
            );
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          logFn(`❌ getPoolSymbolAll failed: ${errMsg}`, 'error');
          allTestsPassed = false;
        }

        // Test 2: Get Tickers (Public)
        logFn('\n--- Test 2: Get Tickers (Public) ---', 'info');
        try {
          const marketsClient = client.markets;
          // First get pools to have valid poolIds
          const pools = await marketsClient.getPoolSymbolAll();
          if (Array.isArray(pools) && pools.length > 0) {
            const poolIds = pools.slice(0, 3).map((p) => p.poolId);
            const tickers = await marketsClient.getTickerList({
              chainId,
              poolIds,
            });
            if (Array.isArray(tickers) && tickers.length > 0) {
              logFn(
                `✅ getTickerList: Got ${tickers.length} tickers`,
                'success',
              );
              const sample = tickers[0];
              logFn(
                `   Sample: ${sample?.symbol || 'N/A'} price=${sample?.lastPrice || 'N/A'}`,
                'info',
              );
            } else {
              logFn(`⚠️ getTickerList: Empty response`, 'warn');
            }
          } else {
            logFn(`⚠️ Skipping ticker test - no pools available`, 'warn');
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          logFn(`❌ getTickerList failed: ${errMsg}`, 'error');
          allTestsPassed = false;
        }

        // Test 3: Get Klines/Candles (Public)
        logFn('\n--- Test 3: Get Klines/Candles (Public) ---', 'info');
        try {
          const marketsClient = client.markets;
          const pools = await marketsClient.getPoolSymbolAll();
          if (Array.isArray(pools) && pools.length > 0) {
            const poolId = pools[0].poolId;
            const klines = await marketsClient.getKlineList({
              poolId,
              chainId,
              interval: '1h',
              limit: 10,
              endTime: Date.now(),
            });
            if (Array.isArray(klines) && klines.length > 0) {
              logFn(
                `✅ getKlineList: Got ${klines.length} candles for ${pools[0].baseSymbol}`,
                'success',
              );
              const sample = klines[0];
              logFn(
                `   Sample: open=${sample?.open} high=${sample?.high} low=${sample?.low} close=${sample?.close}`,
                'info',
              );
            } else {
              logFn(`⚠️ getKlineList: Empty response`, 'warn');
            }
          } else {
            logFn(`⚠️ Skipping kline test - no pools available`, 'warn');
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          logFn(`❌ getKlineList failed: ${errMsg}`, 'error');
          allTestsPassed = false;
        }

        // Test 4: Get Positions (Private - requires address)
        if (address) {
          logFn('\n--- Test 4: Get Positions (Private HTTP) ---', 'info');
          try {
            const positionClient = client.position;
            const result = await positionClient.listPositions(address);
            if (result?.code === 0) {
              const positions = result.data || [];
              logFn(
                `✅ listPositions: Found ${Array.isArray(positions) ? positions.length : 0} positions`,
                'success',
              );
            } else if (Array.isArray(result)) {
              logFn(
                `✅ listPositions: Found ${result.length} positions (direct array)`,
                'success',
              );
            } else {
              logFn(
                `⚠️ listPositions: Response code=${result?.code}, msg=${result?.msg || result?.message}`,
                'warn',
              );
            }
          } catch (error) {
            const errMsg =
              error instanceof Error ? error.message : String(error);
            if (
              errMsg.includes('401') ||
              errMsg.includes('Unauthorized') ||
              errMsg.includes('9401')
            ) {
              logFn(`❌ listPositions requires auth: ${errMsg}`, 'error');
            } else {
              logFn(`❌ listPositions failed: ${errMsg}`, 'error');
            }
            allTestsPassed = false;
          }

          // Test 5: Get Orders (Private - requires address)
          logFn('\n--- Test 5: Get Orders (Private HTTP) ---', 'info');
          try {
            const orderClient = client.order;
            const result = await orderClient.getOrders(address);
            if (result?.code === 0) {
              const orders = result.data || [];
              logFn(
                `✅ getOrders: Found ${Array.isArray(orders) ? orders.length : 0} orders`,
                'success',
              );
            } else if (Array.isArray(result)) {
              logFn(
                `✅ getOrders: Found ${result.length} orders (direct array)`,
                'success',
              );
            } else {
              logFn(
                `⚠️ getOrders: Response code=${result?.code}, msg=${result?.msg || result?.message}`,
                'warn',
              );
            }
          } catch (error) {
            const errMsg =
              error instanceof Error ? error.message : String(error);
            if (
              errMsg.includes('401') ||
              errMsg.includes('Unauthorized') ||
              errMsg.includes('9401')
            ) {
              logFn(`❌ getOrders requires auth: ${errMsg}`, 'error');
            } else {
              logFn(`❌ getOrders failed: ${errMsg}`, 'error');
            }
            allTestsPassed = false;
          }

          // Test 6: Get Account Info (Private - requires address and poolId)
          logFn('\n--- Test 6: Get Account Info (Private HTTP) ---', 'info');
          try {
            const accountClient = client.account;
            const marketsClient = client.markets;
            const pools = await marketsClient.getPoolSymbolAll();
            if (Array.isArray(pools) && pools.length > 0) {
              const poolId = pools[0].poolId;
              const result = await accountClient.getAccountInfo(
                chainId,
                address,
                poolId,
              );
              if (result?.code === 0 && result?.data) {
                logFn(
                  `✅ getAccountInfo: Got account data for pool ${poolId}`,
                  'success',
                );
                const data = result.data;
                logFn(
                  `   Equity: ${data.equity || 'N/A'}, Margin: ${data.margin || 'N/A'}`,
                  'info',
                );
              } else {
                logFn(
                  `⚠️ getAccountInfo: Response code=${result?.code}, msg=${result?.msg || result?.message}`,
                  'warn',
                );
              }
            } else {
              logFn(
                `⚠️ Skipping account info test - no pools available`,
                'warn',
              );
            }
          } catch (error) {
            const errMsg =
              error instanceof Error ? error.message : String(error);
            if (
              errMsg.includes('401') ||
              errMsg.includes('Unauthorized') ||
              errMsg.includes('9401')
            ) {
              logFn(`❌ getAccountInfo requires auth: ${errMsg}`, 'error');
            } else {
              logFn(`❌ getAccountInfo failed: ${errMsg}`, 'error');
            }
            allTestsPassed = false;
          }
        } else {
          logFn(
            '\n--- Skipping Private HTTP Tests (no wallet connected) ---',
            'warn',
          );
        }

        // Summary
        logFn('\n' + '='.repeat(50), 'warn');
        if (allTestsPassed) {
          logFn('HTTP API SUMMARY: All tests passed! ✅', 'success');
        } else {
          logFn('HTTP API SUMMARY: Some tests failed ⚠️', 'warn');
          logFn('Public endpoints work, private may need auth header', 'info');
        }
        logFn('='.repeat(50), 'warn');

        return allTestsPassed;
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logFn(`❌ HTTP API test failed: ${errMsg}`, 'error');
        return false;
      }
    },
    [useTestnet],
  );

  const testSingleFormat = useCallback(
    async (
      formatId: number,
      logFn: (msg: string, type: LogEntry['type']) => void,
    ): Promise<boolean> => {
      const formatInfo = TOKEN_FORMATS.find((f) => f.id === formatId);
      logFn(`\n${'='.repeat(50)}`, 'warn');
      logFn(`Testing Format ${formatId}: ${formatInfo?.name}`, 'warn');
      logFn(`Description: ${formatInfo?.desc}`, 'info');
      logFn(`${'='.repeat(50)}`, 'warn');

      const evmAccount =
        Engine.context.AccountsController?.getSelectedAccount?.();
      const address = evmAccount?.address;

      if (!address) {
        logFn('ERROR: No EVM account selected', 'error');
        return false;
      }

      logFn(`Account address: ${address}`, 'info');

      const chainId = parseInt(getMYXChainId(useTestnet), 10);
      const brokerAddress = getMYXBrokerAddress(useTestnet);
      logFn(
        `Network: ${useTestnet ? 'testnet' : 'mainnet'}, chainId: ${chainId}`,
        'info',
      );

      const signerAdapter = {
        getAddress: async () => address,
        signMessage: async (message: string | Uint8Array) => {
          logFn(`Signer.signMessage called`, 'warn');
          const hexMsg =
            typeof message === 'string'
              ? `0x${Buffer.from(message, 'utf8').toString('hex')}`
              : `0x${Buffer.from(message).toString('hex')}`;
          return Engine.context.KeyringController.signPersonalMessage({
            from: address,
            data: hexMsg,
          });
        },
        signTypedData: async () => '0x',
      };

      currentFormatRef.current = formatId;

      const client = new MyxClient({
        chainId,
        ...(brokerAddress !== '0x0000000000000000000000000000000000000000' && {
          brokerAddress,
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signer: signerAdapter as any,
        isTestnet: useTestnet,
        isBetaMode: false,
        socketConfig: {
          initialReconnectDelay: 5000,
          maxReconnectAttempts: 1,
        },
        getAccessToken: async () => {
          logFn('SDK called getAccessToken()', 'warn');
          return generateToken(currentFormatRef.current, address, logFn);
        },
      });

      const subscriptionClient = client.subscription;
      if (!subscriptionClient) {
        logFn('Subscription module not available', 'error');
        return false;
      }

      if (!subscriptionClient.isConnected) {
        logFn('Connecting WebSocket...', 'info');
        try {
          if (typeof subscriptionClient.connect === 'function') {
            subscriptionClient.connect();
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(
                () => reject(new Error('Connection timeout')),
                10000,
              );
              subscriptionClient.on('open', () => {
                clearTimeout(timeout);
                logFn('WebSocket connected', 'success');
                resolve();
              });
              subscriptionClient.on('error', (err: Error) => {
                clearTimeout(timeout);
                reject(err);
              });
            });
          }
        } catch (connError) {
          const errMsg =
            connError instanceof Error ? connError.message : String(connError);
          logFn(`WebSocket connection error: ${errMsg}`, 'error');
          return false;
        }
      }

      logFn('Calling auth()...', 'info');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subClient = subscriptionClient as any;
      try {
        if (typeof subClient.auth === 'function') {
          await (subClient.auth as () => Promise<unknown>)();
          logFn('auth() returned successfully!', 'success');

          logFn('Testing private subscription...', 'info');
          if (typeof subClient.subscribeOrder === 'function') {
            await (
              subClient.subscribeOrder as (
                cb: (data: unknown) => void,
              ) => Promise<void>
            )(() => {
              // Order callback
            });
            logFn(
              `✅ FORMAT ${formatId} WORKS! Private subscription succeeded!`,
              'success',
            );
            return true;
          }
          logFn(
            `✅ FORMAT ${formatId} auth() succeeded (no subscribeOrder to confirm)`,
            'success',
          );
          return true;
        }
        logFn('No auth() method available', 'error');
        return false;
      } catch (authError) {
        const errMsg =
          authError instanceof Error ? authError.message : String(authError);
        logFn(`auth() failed: ${errMsg}`, 'error');
        return false;
      }
    },
    [useTestnet, generateToken],
  );

  const runTest = useCallback(async () => {
    setIsRunning(true);
    clearLogs();

    if (testMode === 'http') {
      addLog('Starting MYX HTTP API test...', 'info');
      try {
        const success = await testHTTPAPI(addLog);
        if (success) {
          addLog('\n✅ HTTP API tests completed successfully!', 'success');
        } else {
          addLog('\n⚠️ Some HTTP API tests failed', 'warn');
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : JSON.stringify(error);
        addLog(`❌ HTTP test failed: ${errorMsg}`, 'error');
      }
    } else {
      addLog(
        `Starting MYX authentication test with format ${selectedFormat}...`,
        'info',
      );
      try {
        const success = await testSingleFormat(selectedFormat, addLog);
        if (success) {
          addLog(`\n✅ SUCCESS! Format ${selectedFormat} works!`, 'success');
        } else {
          addLog(`\n❌ Format ${selectedFormat} failed`, 'error');
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : JSON.stringify(error);
        addLog(`❌ Test failed: ${errorMsg}`, 'error');
      }
    }

    setIsRunning(false);
  }, [
    addLog,
    clearLogs,
    selectedFormat,
    testSingleFormat,
    testHTTPAPI,
    testMode,
  ]);

  const testAllFormats = useCallback(async () => {
    setIsRunning(true);
    setTestAllMode(true);
    clearLogs();
    addLog('Starting multi-format authentication test...', 'info');
    addLog(
      'Will test each format sequentially and stop on first success',
      'info',
    );

    let successFormat: number | null = null;

    for (const format of TOKEN_FORMATS) {
      try {
        const success = await testSingleFormat(format.id, addLog);
        if (success) {
          successFormat = format.id;
          addLog(`\n${'🎉'.repeat(10)}`, 'success');
          addLog(
            `SUCCESS! Format ${format.id} (${format.name}) works!`,
            'success',
          );
          addLog(`Update MYXClientService.ts to use this format`, 'success');
          addLog(`${'🎉'.repeat(10)}`, 'success');
          break;
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        addLog(`Format ${format.id} error: ${errMsg}`, 'error');
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (successFormat === null) {
      addLog('\n' + '❌'.repeat(10), 'error');
      addLog('ALL FORMATS FAILED', 'error');
      addLog('Consider:', 'warn');
      addLog('1. Check if MYX has an /auth/token or /login endpoint', 'warn');
      addLog('2. Contact MYX team for auth documentation', 'warn');
      addLog('3. Check if there is an OAuth flow', 'warn');
      addLog('❌'.repeat(10), 'error');
    }

    setTestAllMode(false);
    setIsRunning(false);
  }, [addLog, clearLogs, testSingleFormat]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return colors.success.default;
      case 'error':
        return colors.error.default;
      case 'warn':
        return colors.warning.default;
      default:
        return colors.info.default;
    }
  };

  if (!__DEV__) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['bottom', 'left', 'right']}
      >
        <View style={styles.section}>
          <Text variant={TextVariant.HeadingLG}>MYX Auth Debug</Text>
          <Text variant={TextVariant.BodySM} style={styles.subtitle}>
            Only available in development builds
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.section}>
          <Text variant={TextVariant.HeadingMD} style={styles.sectionTitle}>
            MYX API Debug
          </Text>
          <Text variant={TextVariant.BodySM} style={styles.subtitle}>
            Test MYX HTTP API and WebSocket authentication
          </Text>
        </View>

        {/* Test Mode Toggle */}
        <View style={styles.section}>
          <Text variant={TextVariant.BodyMD}>Test Mode:</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                testMode === 'http' && styles.toggleActive,
              ]}
              onPress={() => setTestMode('http')}
            >
              <Text
                variant={TextVariant.BodySM}
                style={
                  testMode === 'http'
                    ? styles.toggleTextActive
                    : styles.toggleText
                }
              >
                HTTP API
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                testMode === 'auth' && styles.toggleActive,
              ]}
              onPress={() => setTestMode('auth')}
            >
              <Text
                variant={TextVariant.BodySM}
                style={
                  testMode === 'auth'
                    ? styles.toggleTextActive
                    : styles.toggleText
                }
              >
                WS Auth
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Network Toggle */}
        <View style={styles.section}>
          <Text variant={TextVariant.BodyMD}>Network:</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, useTestnet && styles.toggleActive]}
              onPress={() => setUseTestnet(true)}
            >
              <Text
                variant={TextVariant.BodySM}
                style={useTestnet ? styles.toggleTextActive : styles.toggleText}
              >
                Testnet
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, !useTestnet && styles.toggleActive]}
              onPress={() => setUseTestnet(false)}
            >
              <Text
                variant={TextVariant.BodySM}
                style={
                  !useTestnet ? styles.toggleTextActive : styles.toggleText
                }
              >
                Mainnet
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Format Selector (only for auth mode) */}
        {testMode === 'auth' && (
          <View style={styles.section}>
            <Text
              variant={TextVariant.BodyMD}
              style={styles.formatSelectorTitle}
            >
              Token Format to Test:
            </Text>
            <View style={styles.formatSelector}>
              {TOKEN_FORMATS.map((format) => (
                <TouchableOpacity
                  key={format.id}
                  style={[
                    styles.formatButton,
                    selectedFormat === format.id && styles.formatButtonSelected,
                  ]}
                  onPress={() => setSelectedFormat(format.id)}
                  disabled={isRunning}
                >
                  <Text
                    variant={TextVariant.BodySM}
                    style={[
                      styles.formatButtonText,
                      selectedFormat === format.id &&
                        styles.formatButtonTextSelected,
                    ]}
                  >
                    {format.id}. {format.name}
                  </Text>
                  <Text
                    variant={TextVariant.BodyXS}
                    style={[
                      styles.formatButtonDesc,
                      selectedFormat === format.id &&
                        styles.formatButtonDescSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {format.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Test Buttons */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, isRunning && styles.buttonDisabled]}
            onPress={runTest}
            disabled={isRunning}
          >
            {isRunning && !testAllMode ? (
              <ActivityIndicator color={colors.primary.inverse} />
            ) : (
              <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
                {testMode === 'http'
                  ? '🔍 Test HTTP API'
                  : `Test Format ${selectedFormat}`}
              </Text>
            )}
          </TouchableOpacity>

          {testMode === 'auth' && (
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonSuccess,
                isRunning && styles.buttonDisabled,
              ]}
              onPress={testAllFormats}
              disabled={isRunning}
            >
              {isRunning && testAllMode ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color={colors.primary.inverse} />
                  <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
                    {' '}
                    Testing All Formats...
                  </Text>
                </View>
              ) : (
                <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
                  🔍 Test ALL Formats (Auto-Stop on Success)
                </Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={clearLogs}
          >
            <Text
              variant={TextVariant.BodyMD}
              style={styles.buttonTextSecondary}
            >
              Clear Logs
            </Text>
          </TouchableOpacity>
        </View>

        {/* Logs Display */}
        <View style={styles.logsSection}>
          <Text variant={TextVariant.BodyMD} style={styles.logsTitle}>
            Logs ({logs.length})
          </Text>
          <View style={styles.logsContainer}>
            {logs.length === 0 ? (
              <Text variant={TextVariant.BodySM} style={styles.logsEmpty}>
                Tap a test button to start
              </Text>
            ) : (
              logs.map((log, index) => (
                <View key={index} style={styles.logEntry}>
                  <Text
                    variant={TextVariant.BodyXS}
                    style={[styles.logText, { color: getLogColor(log.type) }]}
                  >
                    [{log.timestamp}] {log.message}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text variant={TextVariant.BodyXS} style={styles.subtitle}>
            HTTP API test validates public endpoints (pools, tickers, klines)
            and private endpoints (positions, orders, account). WS Auth test
            tries different token formats for WebSocket authentication.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MYXAuthDebug;
