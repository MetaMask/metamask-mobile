import React, { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FilterButton,
  FilterButtonVariant,
  FilterButtonGroup,
  FontWeight,
  HeaderStandard,
  SectionDivider,
  SectionHeader,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { ensureError } from '../../../../util/errorUtils';
import Engine from '../../../../core/Engine';
import {
  type HyperLiquidProvider,
  type MarketInfo,
} from '@metamask/perps-controller';

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
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
    spendableBalance: string;
    marginUsed: string;
    positionCount: number;
    subAccountCount: number;
    subAccountBreakdown?: Record<
      string,
      { spendableBalance: string; totalBalance: string }
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
        const ensured = ensureError(error);
        const errorInfo = { message: ensured.message, stack: ensured.stack };
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
        const ensured = ensureError(error);
        const errorInfo = { message: ensured.message, stack: ensured.stack };
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
        spendableBalance: accountState.spendableBalance,
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
              spendableBalance: breakdown.spendableBalance,
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
        spendableBalance: accountState.spendableBalance,
        marginUsed: accountState.marginUsed,
        positionCount: positions.length,
        subAccountCount,
        subAccountBreakdown: accountState.subAccountBreakdown,
      });

      DevLogger.log('✅ Balance check complete');
    } catch (error) {
      const ensured = ensureError(error);
      const errorInfo = { message: ensured.message, stack: ensured.stack };
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
      const ensured = ensureError(error);
      const errorInfo = { message: ensured.message, stack: ensured.stack };
      DevLogger.log(
        '❌ Transfer failed:\n' + JSON.stringify(errorInfo, null, 2),
      );
      setTransferResult({ status: 'error', error: ensured.message });
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
      const spendableBalance =
        accountState.subAccountBreakdown?.[selectedDex]?.spendableBalance;

      if (!spendableBalance || parseFloat(spendableBalance) <= 0) {
        const message = `⚠️ No available balance on ${selectedDex} DEX to transfer`;
        DevLogger.log(message);
        setTransferResult({
          status: 'error',
          error: message,
        });
        return;
      }

      DevLogger.log(
        `Transferring ALL available balance ($${spendableBalance}) from ${selectedDex} to main`,
      );

      const result = await provider.transferBetweenDexs({
        sourceDex: selectedDex,
        destinationDex: '',
        amount: spendableBalance,
      });

      if (result.success) {
        const message = `✅ Reset complete: Transferred $${spendableBalance} from ${selectedDex} to main DEX`;
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
      const ensured = ensureError(error);
      const errorInfo = { message: ensured.message, stack: ensured.stack };
      DevLogger.log(
        '❌ Transfer failed:\n' + JSON.stringify(errorInfo, null, 2),
      );
      setTransferResult({ status: 'error', error: ensured.message });
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
      const ensured = ensureError(error);
      const errorInfo = { message: ensured.message, stack: ensured.stack };
      DevLogger.log('❌ Order failed:\n' + JSON.stringify(errorInfo, null, 2));
      setOrderResult({ status: 'error', error: ensured.message });
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
      const ensured = ensureError(error);
      const errorInfo = { message: ensured.message, stack: ensured.stack };
      DevLogger.log('❌ Close failed:\n' + JSON.stringify(errorInfo, null, 2));
      setCloseResult({ status: 'error', error: ensured.message });
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  if (!__DEV__) {
    return (
      <Box twClassName="flex-1 bg-default">
        <HeaderStandard
          title="Debug Tools"
          onBack={handleBack}
          includesTopInset
        />
        <Box twClassName="px-4 py-4" style={{ paddingBottom: insets.bottom }}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            Only available in development builds
          </Text>
        </Box>
      </Box>
    );
  }

  if (!provider) {
    return (
      <Box twClassName="flex-1 bg-default">
        <HeaderStandard
          title="HIP-3 Debug Tools"
          onBack={handleBack}
          includesTopInset
        />
        <Box twClassName="px-4 py-4" style={{ paddingBottom: insets.bottom }}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            Provider not initialized
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box twClassName="flex-1 bg-default">
      <HeaderStandard
        title="HIP-3 Debug Tools"
        onBack={handleBack}
        includesTopInset
      />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom }}>
        {/* DEX Selector Section */}
        <Box paddingBottom={3}>
          <SectionHeader title="Step 1: Select HIP-3 DEX">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              Choose a DEX to test (avoids querying all {availableDexs.length}{' '}
              DEXs)
            </Text>
          </SectionHeader>

          {loadingDexs && (
            <Box twClassName="px-4">
              <Spinner />
            </Box>
          )}
          {!loadingDexs && availableDexs.length === 0 && (
            <Box twClassName="px-4">
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                No HIP-3 DEXs available
              </Text>
            </Box>
          )}
          {!loadingDexs && availableDexs.length > 0 && (
            <FilterButtonGroup
              value={selectedDex ?? ''}
              onChange={setSelectedDex}
              variant={FilterButtonVariant.Secondary}
              twClassName="px-4"
            >
              {availableDexs.slice(0, 10).map((dex) => (
                <FilterButton key={dex} value={dex}>
                  {dex}
                </FilterButton>
              ))}
            </FilterButtonGroup>
          )}
        </Box>

        {/* Market Selector Section */}
        {selectedDex && (
          <>
            <SectionDivider />
            <Box paddingBottom={3}>
              <SectionHeader title="Step 2: Select Market">
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                >
                  Choose a market on {selectedDex} DEX for testing
                </Text>
              </SectionHeader>

              {loadingMarkets && (
                <Box twClassName="px-4">
                  <Spinner />
                </Box>
              )}
              {!loadingMarkets && markets.length === 0 && (
                <Box twClassName="px-4">
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    No markets available for {selectedDex}
                  </Text>
                </Box>
              )}
              {!loadingMarkets && markets.length > 0 && (
                <FilterButtonGroup
                  value={selectedMarket ?? ''}
                  onChange={setSelectedMarket}
                  variant={FilterButtonVariant.Secondary}
                  twClassName="px-4"
                >
                  {markets.slice(0, 5).map((market) => (
                    <FilterButton key={market.name} value={market.name}>
                      {market.name}
                    </FilterButton>
                  ))}
                </FilterButtonGroup>
              )}
            </Box>
          </>
        )}

        {/* Balance Check Section */}
        <SectionDivider />
        <Box paddingBottom={3}>
          <SectionHeader title="Balance Check">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              Check balances across all DEXs. Results will be logged to
              DevLogger console.
            </Text>
          </SectionHeader>

          <Box twClassName="px-4 gap-2">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={checkBalance}
            >
              Check Balance
            </Button>

            {balanceInfo && (
              <Box twClassName="p-3 rounded-lg bg-success-muted gap-1">
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.SuccessDefault}
                >
                  Account Summary
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.SuccessDefault}
                >
                  Total: ${balanceInfo.totalBalance}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.SuccessDefault}
                >
                  Available: ${balanceInfo.spendableBalance}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.SuccessDefault}
                >
                  Margin Used: ${balanceInfo.marginUsed}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.SuccessDefault}
                >
                  Positions: {balanceInfo.positionCount} | Sub-Accounts:{' '}
                  {balanceInfo.subAccountCount}
                </Text>

                {balanceInfo.subAccountBreakdown &&
                  Object.keys(balanceInfo.subAccountBreakdown).length > 0 && (
                    <Box twClassName="mt-2 pt-2 border-t border-success-default gap-1">
                      <Text
                        variant={TextVariant.BodySm}
                        fontWeight={FontWeight.Medium}
                        color={TextColor.SuccessDefault}
                      >
                        Per Sub-Account Balances:
                      </Text>
                      {Object.entries(balanceInfo.subAccountBreakdown).map(
                        ([subAccount, breakdown]) => (
                          <Box key={subAccount} twClassName="pl-2 gap-0.5">
                            <Text
                              variant={TextVariant.BodySm}
                              color={TextColor.SuccessDefault}
                            >
                              {subAccount || 'main'}:
                            </Text>
                            <Text
                              variant={TextVariant.BodySm}
                              color={TextColor.SuccessDefault}
                            >
                              {'  '}Total: ${breakdown.totalBalance}
                            </Text>
                            <Text
                              variant={TextVariant.BodySm}
                              color={TextColor.SuccessDefault}
                            >
                              {'  '}Available: ${breakdown.spendableBalance}
                            </Text>
                          </Box>
                        ),
                      )}
                    </Box>
                  )}
              </Box>
            )}
          </Box>
        </Box>

        {/* Manual Transfer Testing */}
        <SectionDivider />
        <Box paddingBottom={3}>
          <SectionHeader title="Manual Transfer Testing" />

          <Box twClassName="px-4 gap-2">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              isDisabled={!selectedDex}
              onPress={testTransferToSelectedDex}
            >
              {`Transfer $10 → ${selectedDex || '(select DEX)'} DEX`}
            </Button>

            <Button
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Lg}
              isFullWidth
              isDisabled={!selectedDex}
              onPress={testTransferFromSelectedDex}
            >
              {`Reset: Transfer ALL ← ${selectedDex || '(select DEX)'} DEX`}
            </Button>

            {transferResult.status === 'loading' && <Spinner />}

            {transferResult.status === 'error' && (
              <Box twClassName="p-3 rounded-lg bg-error-muted">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.ErrorDefault}
                >
                  ❌ {transferResult.error}
                </Text>
              </Box>
            )}

            {transferResult.status === 'success' && (
              <Box twClassName="p-3 rounded-lg bg-success-muted">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.SuccessDefault}
                >
                  {transferResult.data}
                </Text>
              </Box>
            )}
          </Box>
        </Box>

        {/* Auto-Transfer Testing */}
        <SectionDivider />
        <Box paddingBottom={3}>
          <SectionHeader title="Auto-Transfer Testing" />

          <Box twClassName="px-4 gap-2">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={testOrderWithAutoTransfer}
            >
              Place Order (Test Auto-Transfer)
            </Button>

            {orderResult.status === 'loading' && <Spinner />}

            {orderResult.status === 'error' && (
              <Box twClassName="p-3 rounded-lg bg-error-muted">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.ErrorDefault}
                >
                  ❌ {orderResult.error}
                </Text>
              </Box>
            )}

            {orderResult.status === 'success' && (
              <Box twClassName="p-3 rounded-lg bg-success-muted">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.SuccessDefault}
                >
                  {orderResult.data}
                </Text>
              </Box>
            )}

            <Button
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={testCloseWithAutoTransferBack}
            >
              Close Position (Test Transfer Back)
            </Button>

            {closeResult.status === 'loading' && <Spinner />}

            {closeResult.status === 'error' && (
              <Box twClassName="p-3 rounded-lg bg-error-muted">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.ErrorDefault}
                >
                  ❌ {closeResult.error}
                </Text>
              </Box>
            )}

            {closeResult.status === 'success' && (
              <Box twClassName="p-3 rounded-lg bg-success-muted">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.SuccessDefault}
                >
                  {closeResult.data}
                </Text>
              </Box>
            )}
          </Box>
        </Box>

        {/* Debug Info */}
        <SectionDivider />
        <Box twClassName="px-4 pb-4">
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            Check DevLogger console for detailed logs
          </Text>
        </Box>
      </ScrollView>
    </Box>
  );
};

export default HIP3DebugView;
