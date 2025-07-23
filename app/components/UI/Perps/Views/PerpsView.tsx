import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity, type DimensionValue } from 'react-native';
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

// Import PerpsController hooks
import {
  usePerpsAccount,
  usePerpsConnection,
  usePerpsNetwork,
  usePerpsNetworkConfig,
  usePerpsTrading,
  usePerpsPrices,
} from '../hooks';

// Import connection components
import PerpsConnectionErrorView from '../components/PerpsConnectionErrorView';
import PerpsLoader from '../components/PerpsLoader';
import { PerpsNavigationParamList } from '../types/navigation';

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
  };
};

const PerpsView: React.FC<PerpsViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

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
