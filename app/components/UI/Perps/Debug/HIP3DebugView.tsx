import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import styleSheet from './HIP3DebugView.styles';
import Engine from '../../../../core/Engine';
import type { HyperLiquidProvider } from '../controllers/providers/HyperLiquidProvider';
import type { MarketInfo } from '../controllers/types';
import { findOptimalAmount } from '../utils/orderCalculations';

interface TestResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: string;
  error?: string;
}

/**
 * Helper function to get the HyperLiquid provider with proper typing
 * Only use in HIP-3 specific debug/testing code
 */
const getHyperLiquidProvider = (): HyperLiquidProvider | undefined => {
  const provider = Engine.context.PerpsController?.getActiveProvider();
  // Type assertion is safe here because this debug view is specifically for HyperLiquid/HIP-3
  return provider as HyperLiquidProvider | undefined;
};

const HIP3DebugView: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const provider = getHyperLiquidProvider();

  // Market selection state
  const [markets, setMarkets] = useState<MarketInfo[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [loadingMarkets, setLoadingMarkets] = useState(false);

  // Balance and positions display state
  const [balanceInfo, setBalanceInfo] = useState<{
    totalBalance: string;
    availableBalance: string;
    marginUsed: string;
    positionCount: number;
    subAccountCount: number;
    subAccountBreakdown?: Record<
      string,
      { availableBalance: string; totalBalance: string }
    >;
  } | null>(null);

  // Test result states
  const [transferResult, setTransferResult] = useState<TestResult>({
    status: 'idle',
  });
  const [orderResult, setOrderResult] = useState<TestResult>({
    status: 'idle',
  });
  const [closeResult, setCloseResult] = useState<TestResult>({
    status: 'idle',
  });

  // Load HIP-3 markets on mount
  useEffect(() => {
    const loadMarkets = async () => {
      if (!provider) return;

      setLoadingMarkets(true);
      try {
        const allMarkets = await provider.getMarkets();
        // Filter only HIP-3 markets (have ":" in name, e.g., "xyz:XYZ100")
        const hip3Markets = allMarkets.filter((m) => m.name.includes(':'));
        setMarkets(hip3Markets);
        if (hip3Markets.length > 0) {
          setSelectedMarket(hip3Markets[0].name); // Select first by default
        }
        DevLogger.log(`✅ Loaded ${hip3Markets.length} HIP-3 markets`);
        if (hip3Markets.length > 0) {
          DevLogger.log(
            'Available markets:\n' +
              JSON.stringify(
                hip3Markets.map((m) => m.name),
                null,
                2,
              ),
          );
        }
      } catch (error) {
        const errorInfo =
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : String(error);
        DevLogger.log(
          '❌ Failed to load markets:\n' + JSON.stringify(errorInfo, null, 2),
        );
      }
      setLoadingMarkets(false);
    };

    loadMarkets();
  }, [provider]);

  const checkBalance = async () => {
    if (!provider) return;

    try {
      DevLogger.log('🔍 Checking balances across all DEXs...');

      // Get aggregated account state (includes dexBreakdown for HIP-3)
      const accountState = await provider.getAccountState();
      const positions = await provider.getPositions();

      const accountSummary = {
        totalBalance: accountState.totalBalance,
        availableBalance: accountState.availableBalance,
        marginUsed: accountState.marginUsed,
        unrealizedPnl: accountState.unrealizedPnl,
        positions: positions.length,
      };
      DevLogger.log(
        'Total Account State:\n' + JSON.stringify(accountSummary, null, 2),
      );

      // Log sub-account breakdown if available
      const subAccountCount = accountState.subAccountBreakdown
        ? Object.keys(accountState.subAccountBreakdown).length
        : 0;

      if (accountState.subAccountBreakdown) {
        DevLogger.log('\nSub-Account Breakdown:');
        Object.entries(accountState.subAccountBreakdown).forEach(
          ([subAccount, breakdown]) => {
            const subAccountInfo = {
              totalBalance: breakdown.totalBalance,
              availableBalance: breakdown.availableBalance,
            };
            DevLogger.log(
              `  ${subAccount || 'main'} sub-account:\n` +
                JSON.stringify(subAccountInfo, null, 2),
            );
          },
        );
      }

      // Update UI state
      setBalanceInfo({
        totalBalance: accountState.totalBalance,
        availableBalance: accountState.availableBalance,
        marginUsed: accountState.marginUsed,
        positionCount: positions.length,
        subAccountCount,
        subAccountBreakdown: accountState.subAccountBreakdown,
      });

      DevLogger.log('✅ Balance check complete');
    } catch (error) {
      const errorInfo =
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : String(error);
      DevLogger.log(
        '❌ Failed to check balances:\n' + JSON.stringify(errorInfo, null, 2),
      );
    }
  };

  const testTransferToXyz = async () => {
    if (!provider) return;

    setTransferResult({ status: 'loading' });
    DevLogger.log('=== TESTING TRANSFER TO XYZ DEX ===');

    try {
      const result = await provider.transferBetweenDexs({
        sourceDex: '',
        destinationDex: 'xyz',
        amount: '10',
      });

      if (result.success) {
        const message = `✅ Transferred $10 from main to xyz DEX`;
        DevLogger.log(message);
        setTransferResult({
          status: 'success',
          data: message,
        });

        // Automatically refresh balances after successful transfer
        DevLogger.log('Refreshing balances...');
        await checkBalance();
      } else {
        throw new Error(result.error || 'Transfer failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorInfo =
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : String(error);
      DevLogger.log(
        '❌ Transfer failed:\n' + JSON.stringify(errorInfo, null, 2),
      );
      setTransferResult({ status: 'error', error: errorMsg });
    }
  };

  const testTransferFromXyz = async () => {
    if (!provider) return;

    setTransferResult({ status: 'loading' });
    DevLogger.log('=== TESTING TRANSFER FROM XYZ DEX ===');

    try {
      const result = await provider.transferBetweenDexs({
        sourceDex: 'xyz',
        destinationDex: '',
        amount: '10',
      });

      if (result.success) {
        const message = `✅ Transferred $10 from xyz to main DEX`;
        DevLogger.log(message);
        setTransferResult({
          status: 'success',
          data: message,
        });

        // Automatically refresh balances after successful transfer
        DevLogger.log('Refreshing balances...');
        await checkBalance();
      } else {
        throw new Error(result.error || 'Transfer failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorInfo =
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : String(error);
      DevLogger.log(
        '❌ Transfer failed:\n' + JSON.stringify(errorInfo, null, 2),
      );
      setTransferResult({ status: 'error', error: errorMsg });
    }
  };

  const testOrderWithAutoTransfer = async () => {
    if (!provider) return;

    if (!selectedMarket) {
      setOrderResult({
        status: 'error',
        error: 'Please select a market first',
      });
      return;
    }

    setOrderResult({ status: 'loading' });
    DevLogger.log('=== TESTING ORDER WITH AUTO-TRANSFER ===');
    DevLogger.log(`Selected market: ${selectedMarket}`);

    try {
      // Fetch current price and market metadata
      const marketData = await provider.getMarketDataWithPrices();
      const market = marketData.find((m) => m.symbol === selectedMarket);

      if (!market?.price) {
        throw new Error(`Could not fetch price for ${selectedMarket}`);
      }

      const currentPrice = parseFloat(market.price);
      if (isNaN(currentPrice) || currentPrice <= 0) {
        throw new Error(`Invalid price for ${selectedMarket}: ${market.price}`);
      }

      // Get szDecimals from already-loaded markets state
      const marketInfo = markets.find((m) => m.name === selectedMarket);
      if (!marketInfo) {
        throw new Error(
          `Market info not found for ${selectedMarket}. Markets may not be loaded yet.`,
        );
      }
      const szDecimals = marketInfo.szDecimals;

      // Calculate position size for $11 USD notional value
      // Use findOptimalAmount to handle rounding correctly and ensure we meet $10 minimum
      const targetUsdAmount = 11;
      const optimalAmount = findOptimalAmount({
        targetAmount: targetUsdAmount.toString(),
        maxAllowedAmount: 1000, // Reasonable max for test orders
        minAllowedAmount: 10, // HyperLiquid minimum order size
        price: currentPrice,
        szDecimals,
      });

      // Calculate actual position size from optimal amount
      const positionSize = parseFloat(optimalAmount) / currentPrice;

      DevLogger.log('Order calculation:', {
        market: selectedMarket,
        currentPrice: currentPrice.toFixed(2),
        szDecimals,
        targetAmount: targetUsdAmount,
        optimalAmount,
        calculatedPositionSize: positionSize.toFixed(szDecimals),
        expectedNotional: (positionSize * currentPrice).toFixed(2),
      });

      // Place order with calculated size
      const result = await provider.placeOrder({
        coin: selectedMarket,
        isBuy: true,
        size: positionSize.toFixed(szDecimals),
        orderType: 'market',
        leverage: 5,
      });

      if (result.success) {
        const message = `✅ Order placed on ${selectedMarket}\nAuto-transfer should have occurred if needed`;
        DevLogger.log(message);
        setOrderResult({
          status: 'success',
          data: message,
        });

        // Automatically refresh balances after successful order
        DevLogger.log('Refreshing balances...');
        await checkBalance();
      } else {
        throw new Error(result.error || 'Order failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorInfo =
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : String(error);
      DevLogger.log('❌ Order failed:\n' + JSON.stringify(errorInfo, null, 2));
      setOrderResult({ status: 'error', error: errorMsg });
    }
  };

  const testCloseWithAutoTransferBack = async () => {
    if (!provider) return;

    setCloseResult({ status: 'loading' });
    DevLogger.log('=== TESTING CLOSE WITH AUTO-TRANSFER BACK ===');

    try {
      // Get all positions and filter for xyz DEX
      // HIP-3 positions have format: dex:coin (e.g., "xyz:XYZ100")
      const allPositions = await provider.getPositions();
      const xyzPositions = allPositions.filter((p) =>
        p.coin.startsWith('xyz:'),
      );

      if (xyzPositions.length === 0) {
        setCloseResult({
          status: 'error',
          error: 'No positions on xyz DEX to close',
        });
        DevLogger.log('⚠️ No positions on xyz DEX to close');
        return;
      }

      // Close first xyz position
      const position = xyzPositions[0];
      DevLogger.log('Closing position:\n' + JSON.stringify(position, null, 2));

      const result = await provider.closePosition({
        coin: position.coin,
        orderType: 'market',
      });

      if (result.success) {
        const message = `✅ Closed position ${position.coin}\nAuto-transfer back should have occurred`;
        DevLogger.log(message);
        setCloseResult({
          status: 'success',
          data: message,
        });
      } else {
        throw new Error(result.error || 'Close failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorInfo =
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : String(error);
      DevLogger.log('❌ Close failed:\n' + JSON.stringify(errorInfo, null, 2));
      setCloseResult({ status: 'error', error: errorMsg });
    }
  };

  if (!__DEV__) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['bottom', 'left', 'right']}
      >
        <View style={styles.section}>
          <Text variant={TextVariant.HeadingLG}>Debug Tools</Text>
          <Text variant={TextVariant.BodySM} style={styles.subtitle}>
            Only available in development builds
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!provider) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['bottom', 'left', 'right']}
      >
        <View style={styles.section}>
          <Text variant={TextVariant.HeadingLG}>HIP-3 Debug Tools</Text>
          <Text variant={TextVariant.BodySM} style={styles.subtitle}>
            Provider not initialized
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView style={styles.scrollView}>
        {/* Market Selector Section */}
        <View style={styles.section}>
          <Text variant={TextVariant.HeadingMD} style={styles.sectionTitle}>
            Select HIP-3 Market
          </Text>
          <Text variant={TextVariant.BodySM} style={styles.subtitle}>
            Choose a market for testing order placement
          </Text>

          {loadingMarkets ? (
            <ActivityIndicator style={styles.loader} />
          ) : markets.length === 0 ? (
            <Text variant={TextVariant.BodySM} style={styles.subtitle}>
              No HIP-3 markets available
            </Text>
          ) : (
            <View>
              <Text variant={TextVariant.BodySM} style={styles.subtitle}>
                Selected: {selectedMarket || 'None'}
              </Text>
              {markets.slice(0, 5).map((market) => (
                <TouchableOpacity
                  key={market.name}
                  style={[
                    styles.button,
                    selectedMarket === market.name
                      ? styles.button
                      : styles.buttonSecondary,
                  ]}
                  onPress={() => setSelectedMarket(market.name)}
                >
                  <Text
                    variant={TextVariant.BodyMD}
                    style={
                      selectedMarket === market.name
                        ? styles.buttonText
                        : styles.buttonTextSecondary
                    }
                  >
                    {market.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Balance Check Section */}
        <View style={styles.section}>
          <Text variant={TextVariant.HeadingMD} style={styles.sectionTitle}>
            Balance Check
          </Text>
          <Text variant={TextVariant.BodySM} style={styles.subtitle}>
            Check balances across all DEXs. Results will be logged to DevLogger
            console.
          </Text>

          <TouchableOpacity style={styles.button} onPress={checkBalance}>
            <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
              Check Balance
            </Text>
          </TouchableOpacity>

          {/* Display balance info if available */}
          {balanceInfo && (
            <View style={styles.successBox}>
              <Text
                variant={TextVariant.BodySMMedium}
                style={styles.successText}
              >
                Account Summary
              </Text>
              <Text variant={TextVariant.BodySM} style={styles.successText}>
                Total: ${balanceInfo.totalBalance}
              </Text>
              <Text variant={TextVariant.BodySM} style={styles.successText}>
                Available: ${balanceInfo.availableBalance}
              </Text>
              <Text variant={TextVariant.BodySM} style={styles.successText}>
                Margin Used: ${balanceInfo.marginUsed}
              </Text>
              <Text variant={TextVariant.BodySM} style={styles.successText}>
                Positions: {balanceInfo.positionCount} | Sub-Accounts:{' '}
                {balanceInfo.subAccountCount}
              </Text>

              {/* Display per-sub-account balances if available */}
              {balanceInfo.subAccountBreakdown &&
                Object.keys(balanceInfo.subAccountBreakdown).length > 0 && (
                  <View style={styles.subAccountSection}>
                    <Text
                      variant={TextVariant.BodySMMedium}
                      style={styles.successText}
                    >
                      Per Sub-Account Balances:
                    </Text>
                    {Object.entries(balanceInfo.subAccountBreakdown).map(
                      ([subAccount, breakdown]) => (
                        <View key={subAccount} style={styles.subAccountItem}>
                          <Text
                            variant={TextVariant.BodySM}
                            style={styles.successText}
                          >
                            {subAccount || 'main'}:
                          </Text>
                          <Text
                            variant={TextVariant.BodySM}
                            style={styles.successText}
                          >
                            {'  '}Total: ${breakdown.totalBalance}
                          </Text>
                          <Text
                            variant={TextVariant.BodySM}
                            style={styles.successText}
                          >
                            {'  '}Available: ${breakdown.availableBalance}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>
                )}
            </View>
          )}
        </View>

        {/* Manual Transfer Testing */}
        <View style={styles.section}>
          <Text variant={TextVariant.HeadingMD} style={styles.sectionTitle}>
            Manual Transfer Testing
          </Text>

          <TouchableOpacity style={styles.button} onPress={testTransferToXyz}>
            <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
              Transfer $10 → xyz DEX
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={testTransferFromXyz}
          >
            <Text
              variant={TextVariant.BodyMD}
              style={[styles.buttonText, styles.buttonTextSecondary]}
            >
              Transfer $10 ← xyz DEX
            </Text>
          </TouchableOpacity>

          {transferResult.status === 'loading' && (
            <ActivityIndicator style={styles.loader} />
          )}

          {transferResult.status === 'error' && (
            <View style={styles.errorBox}>
              <Text variant={TextVariant.BodySM} style={styles.errorText}>
                ❌ {transferResult.error}
              </Text>
            </View>
          )}

          {transferResult.status === 'success' && (
            <View style={styles.successBox}>
              <Text variant={TextVariant.BodySM} style={styles.successText}>
                {transferResult.data}
              </Text>
            </View>
          )}
        </View>

        {/* Auto-Transfer Testing */}
        <View style={styles.section}>
          <Text variant={TextVariant.HeadingMD} style={styles.sectionTitle}>
            Auto-Transfer Testing
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={testOrderWithAutoTransfer}
          >
            <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
              Place Order (Test Auto-Transfer)
            </Text>
          </TouchableOpacity>

          {orderResult.status === 'loading' && (
            <ActivityIndicator style={styles.loader} />
          )}

          {orderResult.status === 'error' && (
            <View style={styles.errorBox}>
              <Text variant={TextVariant.BodySM} style={styles.errorText}>
                ❌ {orderResult.error}
              </Text>
            </View>
          )}

          {orderResult.status === 'success' && (
            <View style={styles.successBox}>
              <Text variant={TextVariant.BodySM} style={styles.successText}>
                {orderResult.data}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={testCloseWithAutoTransferBack}
          >
            <Text
              variant={TextVariant.BodyMD}
              style={[styles.buttonText, styles.buttonTextSecondary]}
            >
              Close Position (Test Transfer Back)
            </Text>
          </TouchableOpacity>

          {closeResult.status === 'loading' && (
            <ActivityIndicator style={styles.loader} />
          )}

          {closeResult.status === 'error' && (
            <View style={styles.errorBox}>
              <Text variant={TextVariant.BodySM} style={styles.errorText}>
                ❌ {closeResult.error}
              </Text>
            </View>
          )}

          {closeResult.status === 'success' && (
            <View style={styles.successBox}>
              <Text variant={TextVariant.BodySM} style={styles.successText}>
                {closeResult.data}
              </Text>
            </View>
          )}
        </View>

        {/* Debug Info */}
        <View style={styles.section}>
          <Text variant={TextVariant.BodyXS} style={styles.subtitle}>
            Check DevLogger console for detailed logs
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HIP3DebugView;
