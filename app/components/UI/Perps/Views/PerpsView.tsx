import React, { useCallback, useEffect, useState, useContext } from 'react';
import {
  View,
  TouchableOpacity,
  type DimensionValue,
  Linking,
} from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import type { Theme } from '../../../../util/theme/models';
import ScreenView from '../../../Base/ScreenView';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { ToastContext } from '../../../../component-library/components/Toast';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { useSelector } from 'react-redux';
import { selectContractBalances } from '../../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { renderFromTokenMinimalUnit } from '../../../../util/number';
import { type Hex } from '@metamask/utils';

// Import PerpsController hooks
import {
  usePerpsAccount,
  usePerpsConnection,
  usePerpsNetwork,
  usePerpsNetworkConfig,
  usePerpsTrading,
  usePerpsPrices,
  usePerpsPendingWithdrawals,
} from '../hooks';

// Import connection components
import PerpsConnectionErrorView from '../components/PerpsConnectionErrorView';
import PerpsLoader from '../components/PerpsLoader';
import { PerpsNavigationParamList } from '../types/navigation';
import Engine from '../../../../core/Engine';

interface PerpsViewProps {}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 32,
    },
    headerContainer: {
      alignItems: 'center' as const,
      marginBottom: 32,
    },
    buttonContainer: {
      gap: 10,
    },
    button: {
      marginBottom: 16,
    },
    tradingButtonsContainer: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      marginTop: 16,
    },
    tradingButton: {
      flex: 1,
      marginHorizontal: 8,
    },
    marketGridContainer: {
      marginTop: 24,
    },
    marketGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      marginHorizontal: -4,
    },
    marketCard: {
      width: '48%' as DimensionValue,
      marginHorizontal: '1%' as DimensionValue,
      marginBottom: 12,
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.background.alternative,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    marketCardContent: {
      alignItems: 'center' as const,
    },
    marketAsset: {
      fontSize: 16,
      fontWeight: '600' as const,
      marginBottom: 4,
    },
    marketPrice: {
      fontSize: 14,
      marginBottom: 8,
    },
    marketButtons: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      width: '100%' as DimensionValue,
    },
    marketButton: {
      flex: 1,
      marginHorizontal: 2,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 4,
      alignItems: 'center' as const,
    },
    longButton: {
      backgroundColor: colors.success.muted,
    },
    shortButton: {
      backgroundColor: colors.error.muted,
    },
    marketButtonText: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    resultContainer: {
      padding: 16,
      borderRadius: 8,
      backgroundColor: colors.background.alternative,
      marginTop: 16,
    },
    resultText: {
      marginTop: 8,
      lineHeight: 20,
    },
    pendingWithdrawalBanner: {
      backgroundColor: colors.warning.muted,
      padding: 12,
      marginBottom: 16,
      borderRadius: 8,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    pendingWithdrawalText: {
      flex: 1,
      marginRight: 8,
    },
  };
};

const PerpsView: React.FC<PerpsViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const { toastRef } = useContext(ToastContext);

  const [isLoading, setIsLoading] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [result, setResult] = useState<string>('');

  // Popular trading pairs
  // TODO: remove once we integrate real design (was meant for quick access to order page)
  const POPULAR_ASSETS = ['BTC', 'ETH', 'SOL', 'ARB'];

  // Use state hooks
  const cachedAccountState = usePerpsAccount();
  const { getAccountState } = usePerpsTrading();
  const { toggleTestnet } = usePerpsNetworkConfig();
  const currentNetwork = usePerpsNetwork();

  // Use connection provider for connection state
  const {
    isConnected,
    isConnecting,
    isInitialized,
    error: connectionError,
    connect: reconnect,
    resetError,
  } = usePerpsConnection();

  // Get real-time prices for popular assets
  const priceData = usePerpsPrices(POPULAR_ASSETS);

  // Get pending withdrawals
  const pendingWithdrawals = usePerpsPendingWithdrawals();

  // Get USDC balance on Arbitrum
  const contractBalances = useSelector(selectContractBalances);
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);

  // USDC on Arbitrum
  const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
  const usdcBalanceHex = contractBalances?.[USDC_ADDRESS];
  const usdcBalance = usdcBalanceHex
    ? renderFromTokenMinimalUnit(usdcBalanceHex, 6) // USDC has 6 decimals
    : '0';

  const getAccountBalance = useCallback(async () => {
    setIsLoading(true);
    setResult('');

    try {
      const accountState = await getAccountState();

      const resultLines = [
        '✅ Account Balance Retrieved Successfully!',
        '',
        `💰 Total Balance: $${accountState.totalBalance}`,
        `💳 Available Balance: $${accountState.availableBalance}`,
        `📊 Margin Used: $${accountState.marginUsed}`,
        `📈 Unrealized PnL: $${accountState.unrealizedPnl}`,
        '',
        `🌐 Network: ${currentNetwork.toUpperCase()}`,
      ];

      setResult(resultLines.join('\n'));
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : strings('perps.errors.unknownError');
      const fullErrorMessage = strings('perps.errors.accountBalanceFailed', {
        error: errorMessage,
      });
      setResult(fullErrorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [getAccountState, currentNetwork]);

  // Automatically load account state on mount and when network changes
  useEffect(() => {
    // Only load account state if we're connected and initialized
    if (isConnected && isInitialized) {
      // Fire and forget - errors are already handled in getAccountState
      // and stored in the controller's state
      getAccountState();
    }
  }, [getAccountState, currentNetwork, isConnected, isInitialized]);

  // Start monitoring withdrawals when component is mounted and active
  useEffect(() => {
    if (isConnected && isInitialized && pendingWithdrawals.length > 0) {
      // Get the PerpsController to start monitoring
      const { PerpsController } = Engine.context;
      PerpsController.startWithdrawalMonitoring();

      // Stop monitoring when component unmounts
      return () => {
        PerpsController.stopWithdrawalMonitoring();
      };
    }
  }, [isConnected, isInitialized, pendingWithdrawals.length]);

  const handleToggleTestnet = async () => {
    setIsToggling(true);
    setResult('');

    try {
      const toggleResult = await toggleTestnet();

      if (toggleResult.success) {
        const newNetwork = toggleResult.isTestnet ? 'TESTNET' : 'MAINNET';
        setResult(
          `✅ Successfully switched to ${newNetwork}\n🔄 Current UI shows: ${currentNetwork.toUpperCase()}`,
        );
      } else {
        setResult(
          strings('perps.errors.networkToggleFailed', {
            error: toggleResult.error,
          }),
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : strings('perps.errors.unknownError');
      setResult(
        strings('perps.errors.networkToggleFailed', { error: errorMessage }),
      );
    } finally {
      setIsToggling(false);
    }
  };

  const handleRetryConnection = async () => {
    resetError();
    await reconnect();
  };

  const handleMarketListNavigation = async () => {
    navigation.navigate(Routes.PERPS.MARKETS);
  };

  const handlePositionsNavigation = async () => {
    navigation.navigate(Routes.PERPS.POSITIONS);
  };

  // Show connection error screen if there's an error
  if (connectionError) {
    return (
      <PerpsConnectionErrorView
        error={connectionError}
        onRetry={handleRetryConnection}
        isRetrying={isConnecting}
      />
    );
  }

  // Show loader while initializing or connecting
  if (!isInitialized || isConnecting) {
    return (
      <PerpsLoader
        message={
          !isInitialized
            ? 'Initializing Perps controller...'
            : 'Connecting to Perps trading...'
        }
        fullScreen
      />
    );
  }

  return (
    <ScreenView>
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Text variant={TextVariant.HeadingLG} color={TextColor.Default}>
            Perps Trading (Minimal)
          </Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
            Core Controller & Services Testing
          </Text>
          <Text
            variant={TextVariant.BodySM}
            color={
              currentNetwork === 'testnet'
                ? TextColor.Warning
                : TextColor.Success
            }
          >
            Network: {currentNetwork.toUpperCase()}
          </Text>
          {cachedAccountState ? (
            <>
              <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
                Balance: ${cachedAccountState.totalBalance}
              </Text>
              {parseFloat(cachedAccountState.totalBalance) === 0 && (
                <Text variant={TextVariant.BodySM} color={TextColor.Warning}>
                  No funds deposited. Use &apos;Deposit Funds&apos; to get
                  started.
                </Text>
              )}
            </>
          ) : isLoading ? (
            <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
              Loading balance...
            </Text>
          ) : (
            <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
              Balance will load automatically
            </Text>
          )}
        </View>

        {/* Pending Withdrawals Banner */}
        {pendingWithdrawals.length > 0 && (
          <View style={styles.pendingWithdrawalBanner}>
            <View style={{ flex: 1 }}>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Warning}
                style={styles.pendingWithdrawalText}
              >
                {pendingWithdrawals.length === 1
                  ? `Withdrawal of ${pendingWithdrawals[0].amount} USDC ${
                      pendingWithdrawals[0].status === 'processing'
                        ? 'processing'
                        : 'pending'
                    }...`
                  : `${pendingWithdrawals.length} withdrawals in progress...`}
              </Text>
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                {pendingWithdrawals[0].status === 'processing'
                  ? 'Finalizing on Arbitrum...'
                  : 'HyperLiquid validators signing...'}
              </Text>
              {/* Debug: Show current USDC balance */}
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Muted}
                style={{ marginTop: 4 }}
              >
                Current USDC: {usdcBalance} | Address:{' '}
                {selectedAddress?.slice(0, 6)}...
              </Text>
              {/* Debug: Link to Arbiscan */}
              <TouchableOpacity
                onPress={() => {
                  const arbiscanUrl = `https://arbiscan.io/token/${USDC_ADDRESS}?a=${selectedAddress}`;
                  Linking.openURL(arbiscanUrl);
                }}
                style={{ marginTop: 4 }}
              >
                <Text variant={TextVariant.BodySM} color={TextColor.Primary}>
                  🔗 View on Arbiscan
                </Text>
              </TouchableOpacity>
            </View>
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Sm}
              onPress={async () => {
                // Force check withdrawal status
                const { PerpsController } = Engine.context;

                // Store current status to detect changes
                const currentStatuses = pendingWithdrawals.map((w) => ({
                  id: w.withdrawalId,
                  status: w.status,
                }));

                await PerpsController.monitorPendingWithdrawals();

                // Check if any withdrawals completed
                const { pendingWithdrawals: updatedWithdrawals } =
                  PerpsController.state;
                const completedCount = currentStatuses.filter((current) => {
                  const updated = updatedWithdrawals.find(
                    (w) => w.withdrawalId === current.id,
                  );
                  return (
                    current.status !== 'completed' &&
                    updated?.status === 'completed'
                  );
                }).length;

                if (completedCount > 0) {
                  toastRef?.current?.showToast({
                    variant: ToastVariants.Icon,
                    iconName: IconName.Confirmation,
                    hasNoTimeout: false,
                    labelOptions: [
                      {
                        label: strings('perps.withdrawal.completed'),
                        isBold: true,
                      },
                      {
                        label: 'USDC has arrived in your wallet',
                      },
                    ],
                  });
                }
              }}
              label="Check"
            />
          </View>
        )}

        <View style={styles.buttonContainer}>
          {/* Core functionality buttons */}
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('perps.buttons.get_account_balance')}
            onPress={getAccountBalance}
            loading={isLoading}
            style={styles.button}
          />

          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('perps.buttons.deposit_funds')}
            onPress={() => navigation.navigate(Routes.PERPS.DEPOSIT)}
            style={styles.button}
          />

          {/* Show withdraw button only if there's available balance */}
          {cachedAccountState?.availableBalance &&
            parseFloat(
              cachedAccountState.availableBalance
                .replace('$', '')
                .replace(',', ''),
            ) > 0 && (
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label={strings('perps.withdrawal.title')}
                onPress={() => navigation.navigate(Routes.PERPS.WITHDRAW)}
                style={styles.button}
              />
            )}

          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings(
              currentNetwork === 'testnet'
                ? 'perps.buttons.switch_to_mainnet'
                : 'perps.buttons.switch_to_testnet',
            )}
            onPress={handleToggleTestnet}
            loading={isToggling}
            style={styles.button}
          />

          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('perps.buttons.view_markets')}
            onPress={handleMarketListNavigation}
          />

          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('perps.buttons.positions')}
            onPress={handlePositionsNavigation}
            loading={isLoading}
            style={styles.button}
          />
        </View>

        {/* Market Grid */}
        <View style={styles.marketGridContainer}>
          <Text variant={TextVariant.BodyLGMedium} color={TextColor.Default}>
            Popular Markets
          </Text>
          <View style={styles.marketGrid}>
            {POPULAR_ASSETS.map((asset) => {
              const price = priceData[asset]?.price || '---';
              const change = priceData[asset]?.percentChange24h || '0';
              const priceNum = parseFloat(price);
              const changeNum = parseFloat(change);

              return (
                <View key={asset} style={styles.marketCard}>
                  <View style={styles.marketCardContent}>
                    <Text
                      variant={TextVariant.BodyLGMedium}
                      style={styles.marketAsset}
                    >
                      {asset}
                    </Text>
                    <Text
                      variant={TextVariant.BodyMD}
                      color={TextColor.Default}
                      style={styles.marketPrice}
                    >
                      ${priceNum > 0 ? priceNum.toLocaleString() : '---'}
                    </Text>
                    <Text
                      variant={TextVariant.BodySM}
                      color={
                        changeNum >= 0 ? TextColor.Success : TextColor.Error
                      }
                    >
                      {changeNum >= 0 ? '+' : ''}
                      {changeNum.toFixed(2)}%
                    </Text>
                    <View style={styles.marketButtons}>
                      <TouchableOpacity
                        style={[styles.marketButton, styles.longButton]}
                        onPress={() =>
                          navigation.navigate(Routes.PERPS.ORDER, {
                            direction: 'long',
                            asset,
                          })
                        }
                      >
                        <Text
                          variant={TextVariant.BodySM}
                          color={TextColor.Success}
                          style={styles.marketButtonText}
                        >
                          Long
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.marketButton, styles.shortButton]}
                        onPress={() =>
                          navigation.navigate(Routes.PERPS.ORDER, {
                            direction: 'short',
                            asset,
                          })
                        }
                      >
                        <Text
                          variant={TextVariant.BodySM}
                          color={TextColor.Error}
                          style={styles.marketButtonText}
                        >
                          Short
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Custom asset input */}
          <View style={styles.tradingButtonsContainer}>
            <Button
              variant={ButtonVariants.Link}
              size={ButtonSize.Md}
              width={ButtonWidthTypes.Full}
              label="Trade INVALID asset →"
              onPress={() =>
                navigation.navigate(Routes.PERPS.ORDER, {
                  direction: 'long',
                  asset: 'WRONGNAME', // This will demonstrate the invalid asset handling
                })
              }
            />
          </View>
        </View>

        {result ? (
          <View style={styles.resultContainer}>
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
              Result:
            </Text>
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Muted}
              style={styles.resultText}
            >
              {result}
            </Text>
          </View>
        ) : null}
      </View>
    </ScreenView>
  );
};

export default PerpsView;
