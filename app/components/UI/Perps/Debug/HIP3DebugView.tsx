import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import { usePerpsConnection } from '../hooks/usePerpsConnection';
import Engine from '../../../../core/Engine';
import styleSheet from './HIP3DebugView.styles';

interface TestResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: unknown;
  error?: string;
}

const HIP3DebugView: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const { getProvider } = usePerpsConnection();
  const provider = getProvider();

  // Test 1: Fetch DEXs
  const [dexsResult, setDexsResult] = useState<TestResult>({ status: 'idle' });
  const [selectedDex, setSelectedDex] = useState<string>('');

  // Test 2: Fetch Markets
  const [marketsResult, setMarketsResult] = useState<TestResult>({
    status: 'idle',
  });

  // Test 3: Check Balance
  const [userAddress, setUserAddress] = useState<string>('');
  const [balanceResult, setBalanceResult] = useState<TestResult>({
    status: 'idle',
  });

  // Test 4: Price Subscription
  const [priceSubResult, setPriceSubResult] = useState<TestResult>({
    status: 'idle',
  });
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Test 5: USD Send
  const [usdSendDest, setUsdSendDest] = useState<string>('');
  const [usdSendAmount, setUsdSendAmount] = useState<string>('');
  const [usdSendResult, setUsdSendResult] = useState<TestResult>({
    status: 'idle',
  });

  // Test 1: Fetch Available DEXs
  const handleFetchDexs = async () => {
    if (!provider) {
      setDexsResult({
        status: 'error',
        error: 'Provider not initialized',
      });
      return;
    }

    setDexsResult({ status: 'loading' });
    try {
      const dexs = await Engine.context.PerpsController.getAvailableDexs({});
      setDexsResult({ status: 'success', data: dexs });
    } catch (error) {
      setDexsResult({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Test 2: Get DEX Markets
  const handleFetchMarkets = async () => {
    if (!provider) {
      setMarketsResult({
        status: 'error',
        error: 'Provider not initialized',
      });
      return;
    }

    setMarketsResult({ status: 'loading' });
    try {
      const markets = await Engine.context.PerpsController.getMarkets({
        dex: selectedDex || '',
      });
      setMarketsResult({ status: 'success', data: markets });
    } catch (error) {
      setMarketsResult({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Test 3: Check Balance
  const handleCheckBalance = async () => {
    if (!provider) {
      setBalanceResult({
        status: 'error',
        error: 'Provider not initialized',
      });
      return;
    }

    if (!userAddress) {
      setBalanceResult({
        status: 'error',
        error: 'User address required',
      });
      return;
    }

    setBalanceResult({ status: 'loading' });
    try {
      // Note: clearinghouseState with dex param already works via existing provider methods
      // We're just testing the dex parameter support that already exists in the SDK
      const mainBalance = await Engine.context.PerpsController.getAccountState({
        source: 'hip3_debug',
      });

      setBalanceResult({
        status: 'success',
        data: {
          mainDex: mainBalance,
          note: 'DEX-specific balance query needs direct provider access - not yet exposed through controller',
        },
      });
    } catch (error) {
      setBalanceResult({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Test 4: Subscribe to Prices
  const handleTogglePriceSubscription = async () => {
    if (!provider) {
      setPriceSubResult({
        status: 'error',
        error: 'Provider not initialized',
      });
      return;
    }

    if (isSubscribed) {
      setIsSubscribed(false);
      setPriceSubResult({ status: 'idle' });
      return;
    }

    setPriceSubResult({ status: 'loading' });
    setPriceSubResult({
      status: 'success',
      data: {
        note: 'Price subscription with DEX param requires direct provider access',
        hint: 'SDK already supports: allMids({ dex: "xyz" }, callback)',
      },
    });
    setIsSubscribed(true);
  };

  // Test 5: USD Send
  const handleTestUsdSend = async () => {
    if (!provider) {
      setUsdSendResult({
        status: 'error',
        error: 'Provider not initialized',
      });
      return;
    }

    if (!usdSendDest || !usdSendAmount) {
      setUsdSendResult({
        status: 'error',
        error: 'Destination address and amount required',
      });
      return;
    }

    setUsdSendResult({ status: 'loading' });
    setUsdSendResult({
      status: 'success',
      data: {
        note: 'USD Send requires direct provider access and wallet signing',
        hint: 'SDK supports: provider.exchangeClient.usdSend({ destination, amount })',
        inputs: { destination: usdSendDest, amount: usdSendAmount },
      },
    });
  };

  const renderTestSection = (
    title: string,
    result: TestResult,
    children: React.ReactNode,
  ) => (
    <View style={styles.section}>
      <Text variant={TextVariant.HeadingSM} style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
      {result.status === 'loading' && (
        <ActivityIndicator style={styles.loader} />
      )}
      {result.status === 'error' && (
        <View style={styles.errorBox}>
          <Text variant={TextVariant.BodySM} style={styles.errorText}>
            Error: {result.error}
          </Text>
        </View>
      )}
      {result.status === 'success' && (
        <View style={styles.resultBox}>
          <Text variant={TextVariant.BodyXS} style={styles.resultText}>
            {JSON.stringify(result.data, null, 2)}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.header}>
        <Text variant={TextVariant.HeadingLG}>HIP-3 Debug</Text>
        <Text variant={TextVariant.BodySM} style={styles.subtitle}>
          Test HIP-3 APIs and assumptions
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Test 1: Fetch DEXs */}
        {renderTestSection(
          '1. Fetch Available DEXs',
          dexsResult,
          <TouchableOpacity style={styles.button} onPress={handleFetchDexs}>
            <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
              Fetch DEXs
            </Text>
          </TouchableOpacity>,
        )}

        {/* Test 2: Get DEX Markets */}
        {renderTestSection(
          '2. Get DEX Markets',
          marketsResult,
          <>
            <TextInput
              style={styles.input}
              placeholder="DEX name (empty for main)"
              value={selectedDex}
              onChangeText={setSelectedDex}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleFetchMarkets}
            >
              <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
                Fetch Markets
              </Text>
            </TouchableOpacity>
          </>,
        )}

        {/* Test 3: Check Balance */}
        {renderTestSection(
          '3. Check Balance',
          balanceResult,
          <>
            <TextInput
              style={styles.input}
              placeholder="User address (0x...)"
              value={userAddress}
              onChangeText={setUserAddress}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="DEX name (empty for main)"
              value={selectedDex}
              onChangeText={setSelectedDex}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleCheckBalance}
            >
              <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
                Check Balance
              </Text>
            </TouchableOpacity>
          </>,
        )}

        {/* Test 4: Price Subscription */}
        {renderTestSection(
          '4. Subscribe to Prices',
          priceSubResult,
          <>
            <TextInput
              style={styles.input}
              placeholder="DEX name (empty for main)"
              value={selectedDex}
              onChangeText={setSelectedDex}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleTogglePriceSubscription}
            >
              <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
                {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
              </Text>
            </TouchableOpacity>
          </>,
        )}

        {/* Test 5: USD Send */}
        {renderTestSection(
          '5. Test usdSend',
          usdSendResult,
          <>
            <TextInput
              style={styles.input}
              placeholder="Destination address (0x...)"
              value={usdSendDest}
              onChangeText={setUsdSendDest}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Amount (USD)"
              value={usdSendAmount}
              onChangeText={setUsdSendAmount}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={styles.button} onPress={handleTestUsdSend}>
              <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
                Send USD
              </Text>
            </TouchableOpacity>
          </>,
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HIP3DebugView;
