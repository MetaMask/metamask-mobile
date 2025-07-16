import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import type { Theme } from '../../../../util/theme/models';
import ScreenView from '../../../Base/ScreenView';

// Import PerpsController hooks
import {
  usePerpsAccount,
  usePerpsConnection,
  usePerpsNetwork,
  usePerpsNetworkConfig,
  usePerpsTrading,
} from '../hooks';

// Preview market data component removed for minimal PR

// Import connection components
import PerpsConnectionErrorView from '../components/PerpsConnectionErrorView';
import PerpsLoader from '../components/PerpsLoader';
import Routes from '../../../../constants/navigation/Routes';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { PerpsNavigationParamList } from '../types/navigation';

interface PerpsViewProps { }

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
      marginBottom: 24,
    },
    button: {
      marginBottom: 16,
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
  const [isLoading, setIsLoading] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [result, setResult] = useState<string>('');
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

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
        error instanceof Error ? error.message : 'Unknown error';
      const fullErrorMessage = `❌ Failed to get account balance: ${errorMessage}`;
      setResult(fullErrorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [getAccountState, currentNetwork]);

  // Automatically load account state on mount and when network changes
  useEffect(() => {

    // Only load account state if we're connected and initialized
    if (isConnected && isInitialized) {
      getAccountState().catch(() => {
        // Silent failure - error already handled in getAccountState
      });
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
        setResult(`❌ Failed to toggle network: ${toggleResult.error}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      setResult(`❌ Failed to toggle network: ${errorMessage}`);
    } finally {
      setIsToggling(false);
    }
  };

  const handleRetryConnection = async () => {
    resetError();
    await reconnect();
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
            <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
              Cached Balance: ${cachedAccountState.totalBalance}
            </Text>
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
            label="Get Account Balance"
            onPress={getAccountBalance}
            loading={isLoading}
            style={styles.button}
          />


          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label="Deposit Funds"
            onPress={() => navigation.navigate(Routes.PERPS.DEPOSIT)}
            style={styles.button}
          />

          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={`Switch to ${currentNetwork === 'testnet' ? 'Mainnet' : 'Testnet'
              }`}
            onPress={handleToggleTestnet}
            loading={isToggling}
            style={styles.button}
          />
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
