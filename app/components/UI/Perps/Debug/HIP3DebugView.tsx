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

  // DEX selection state
  const [availableDexs, setAvailableDexs] = useState<string[]>([]);
  const [selectedDex, setSelectedDex] = useState<string | null>(null);
  const [loadingDexs, setLoadingDexs] = useState(false);

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

  // Load available DEXs using the provider's getAvailableHip3Dexs method
  useEffect(() => {
    const loadDexs = async () => {
      if (!provider) return;

      setLoadingDexs(true);
      try {
        DevLogger.log('🔍 Fetching HIP-3 DEXs with markets...');

        // Use the provider's method to get DEXs that have markets
        const dexsWithMarkets = await provider.getAvailableHip3Dexs();

        if (dexsWithMarkets.length > 0) {
          setAvailableDexs(dexsWithMarkets);
          setSelectedDex(dexsWithMarkets[0]); // Select first DEX by default
          DevLogger.log(
            `✅ Loaded ${dexsWithMarkets.length} HIP-3 DEXs with markets`,
          );
        } else {
          DevLogger.log('⚠️ No HIP-3 DEXs with markets found');
          DevLogger.log('This might mean:');
          DevLogger.log('  1. HIP-3 feature is disabled (check equity flag)');
          DevLogger.log('  2. All testnet DEXs have empty universes');
          DevLogger.log('  3. API connectivity issues');
        }
      } catch (error) {
        const errorInfo =
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : String(error);
        DevLogger.log(
          '❌ Failed to load DEXs:\n' + JSON.stringify(errorInfo, null, 2),
        );
      }
      setLoadingDexs(false);
    };

    loadDexs();
  }, [provider]);

  // Load markets for selected DEX
  useEffect(() => {
    const loadMarkets = async () => {
      if (!provider || !selectedDex) return;

      setLoadingMarkets(true);
      try {
        const allMarkets = await provider.getMarkets();
        // Filter markets for selected DEX only
        const dexMarkets = allMarkets.filter((m) =>
          m.name.startsWith(`${selectedDex}:`),
        );
        setMarkets(dexMarkets);
        if (dexMarkets.length > 0) {
          setSelectedMarket(dexMarkets[0].name); // Select first market by default
        } else {
          setSelectedMarket(null);
        }
        DevLogger.log(
          `✅ Loaded ${dexMarkets.length} markets for DEX "${selectedDex}"`,
        );
        if (dexMarkets.length > 0) {
          DevLogger.log(
            'Available markets:\n' +
              JSON.stringify(
                dexMarkets.map((m) => m.name),
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
  }, [provider, selectedDex]);

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

  const testTransferToSelectedDex = async () => {
    if (!provider || !selectedDex) return;

    setTransferResult({ status: 'loading' });
    DevLogger.log(
      `=== TESTING TRANSFER TO ${selectedDex.toUpperCase()} DEX ===`,
    );

    try {
      const result = await provider.transferBetweenDexs({
        sourceDex: '',
        destinationDex: selectedDex,
        amount: '10',
      });

      if (result.success) {
        const message = `✅ Transferred $10 from main to ${selectedDex} DEX`;
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

  const testTransferFromSelectedDex = async () => {
    if (!provider || !selectedDex) return;

    setTransferResult({ status: 'loading' });
    DevLogger.log(
      `=== TESTING TRANSFER FROM ${selectedDex.toUpperCase()} DEX (FULL RESET) ===`,
    );

    try {
      // Get current balance on selected DEX
      const accountState = await provider.getAccountState();
      const availableBalance =
        accountState.subAccountBreakdown?.[selectedDex]?.availableBalance;

      if (!availableBalance || parseFloat(availableBalance) <= 0) {
        const message = `⚠️ No available balance on ${selectedDex} DEX to transfer`;
        DevLogger.log(message);
        setTransferResult({
          status: 'error',
          error: message,
        });
        return;
      }

      DevLogger.log(
        `Transferring ALL available balance ($${availableBalance}) from ${selectedDex} to main`,
      );

      const result = await provider.transferBetweenDexs({
        sourceDex: selectedDex,
        destinationDex: '',
        amount: availableBalance,
      });

      if (result.success) {
        const message = `✅ Reset complete: Transferred $${availableBalance} from ${selectedDex} to main DEX`;
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

      // market.price is formatted with commas (e.g., "$25,106"), so we need to strip formatting
      const priceString = market.price.replace(/[$,]/g, '');
      const currentPrice = parseFloat(priceString);
      if (isNaN(currentPrice) || currentPrice <= 0) {
        throw new Error(
          `Invalid price for ${selectedMarket}: ${market.price} (parsed: ${priceString})`,
        );
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
      // USD as source of truth - provider will recalculate size with fresh price
      const targetUsdAmount = 11;

      // Calculate position size from USD amount
      const positionSize = targetUsdAmount / currentPrice;
      const multiplier = Math.pow(10, szDecimals);
      const roundedPositionSize =
        Math.round(positionSize * multiplier) / multiplier;

      DevLogger.log('Order calculation:', {
        market: selectedMarket,
        currentPrice: currentPrice.toFixed(2),
        szDecimals,
        targetAmount: targetUsdAmount,
        calculatedPositionSize: roundedPositionSize.toFixed(szDecimals),
        expectedNotional: (roundedPositionSize * currentPrice).toFixed(2),
      });

      // Place order with calculated size
      // USD-as-source-of-truth: provide currentPrice and usdAmount for validation
      const result = await provider.placeOrder({
        symbol: selectedMarket,
        isBuy: true,
        size: roundedPositionSize.toFixed(szDecimals),
        orderType: 'market',
        leverage: 5,
        // Required by USD-as-source-of-truth validation
        currentPrice,
        usdAmount: targetUsdAmount.toString(),
        priceAtCalculation: currentPrice,
        maxSlippageBps: 100, // 1% slippage tolerance
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
    if (!provider || !selectedDex) return;

    setCloseResult({ status: 'loading' });
    DevLogger.log('=== TESTING CLOSE WITH AUTO-TRANSFER BACK ===');

    try {
      // Get all positions and filter for selected DEX
      // HIP-3 positions have format: dex:coin (e.g., "xyz:XYZ100")
      const allPositions = await provider.getPositions();
      const dexPositions = allPositions.filter((p) =>
        p.symbol.startsWith(`${selectedDex}:`),
      );

      if (dexPositions.length === 0) {
        setCloseResult({
          status: 'error',
          error: `No positions on ${selectedDex} DEX to close`,
        });
        DevLogger.log(`⚠️ No positions on ${selectedDex} DEX to close`);
        return;
      }

      // Close first position on selected DEX
      const position = dexPositions[0];
      DevLogger.log('Closing position:\n' + JSON.stringify(position, null, 2));

      const result = await provider.closePosition({
        symbol: position.symbol,
        orderType: 'market',
      });

      if (result.success) {
        const message = `✅ Closed position ${position.symbol}\nAuto-transfer back should have occurred`;
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
        {/* DEX Selector Section */}
        <View style={styles.section}>
          <Text variant={TextVariant.HeadingMD} style={styles.sectionTitle}>
            Step 1: Select HIP-3 DEX
          </Text>
          <Text variant={TextVariant.BodySM} style={styles.subtitle}>
            Choose a DEX to test (avoids querying all {availableDexs.length}{' '}
            DEXs)
          </Text>

          {loadingDexs && <ActivityIndicator style={styles.loader} />}
          {!loadingDexs && availableDexs.length === 0 && (
            <Text variant={TextVariant.BodySM} style={styles.subtitle}>
              No HIP-3 DEXs available
            </Text>
          )}
          {!loadingDexs && availableDexs.length > 0 && (
            <View>
              <Text variant={TextVariant.BodySM} style={styles.subtitle}>
                Selected: {selectedDex || 'None'}
              </Text>
              {availableDexs.slice(0, 10).map((dex) => (
                <TouchableOpacity
                  key={dex}
                  style={[
                    styles.button,
                    selectedDex === dex
                      ? styles.button
                      : styles.buttonSecondary,
                  ]}
                  onPress={() => setSelectedDex(dex)}
                >
                  <Text
                    variant={TextVariant.BodyMD}
                    style={
                      selectedDex === dex
                        ? styles.buttonText
                        : styles.buttonTextSecondary
                    }
                  >
                    {dex}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Market Selector Section */}
        {selectedDex && (
          <View style={styles.section}>
            <Text variant={TextVariant.HeadingMD} style={styles.sectionTitle}>
              Step 2: Select Market
            </Text>
            <Text variant={TextVariant.BodySM} style={styles.subtitle}>
              Choose a market on {selectedDex} DEX for testing
            </Text>

            {loadingMarkets && <ActivityIndicator style={styles.loader} />}
            {!loadingMarkets && markets.length === 0 && (
              <Text variant={TextVariant.BodySM} style={styles.subtitle}>
                No markets available for {selectedDex}
              </Text>
            )}
            {!loadingMarkets && markets.length > 0 && (
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
        )}

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

          <TouchableOpacity
            style={styles.button}
            onPress={testTransferToSelectedDex}
            disabled={!selectedDex}
          >
            <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
              Transfer $10 → {selectedDex || '(select DEX)'} DEX
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={testTransferFromSelectedDex}
            disabled={!selectedDex}
          >
            <Text
              variant={TextVariant.BodyMD}
              style={[styles.buttonText, styles.buttonTextSecondary]}
            >
              Reset: Transfer ALL ← {selectedDex || '(select DEX)'} DEX
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
