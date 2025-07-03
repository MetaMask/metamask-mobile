import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../component-library/hooks';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import ScreenView from '../../Base/ScreenView';
import Logger from '../../../util/Logger';
import Routes from '../../../constants/navigation/Routes';

// Import Hyperliquid SDK components
import {
  HttpTransport,
  InfoClient,
  WebSocketTransport,
  SubscriptionClient,
} from '@deeeed/hyperliquid-node20';

interface PerpsViewProps {}

const styleSheet = () => ({
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
    marginBottom: 32,
  },
  button: {
    marginBottom: 16,
  },
  resultContainer: {
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  resultText: {
    marginTop: 8,
    lineHeight: 20,
  },
});

const PerpsView: React.FC<PerpsViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const testSDKConnection = async () => {
    setIsLoading(true);
    setTestResult('');

    try {
      Logger.log('Perps: Testing SDK connection...');
      // Create HTTP transport and InfoClient
      const transport = new HttpTransport();
      const infoClient = new InfoClient({ transport });

      // Test basic functionality - get all mids (prices)
      const allMids = await infoClient.allMids();

      if (allMids) {
        const successMessage =
          '✅ SDK connection successful!\nRetrieved market data from Hyperliquid';
        setTestResult(successMessage);
        Logger.log('Perps: SDK test successful', {
          dataCount: Object.keys(allMids).length,
        });
      } else {
        const warningMessage = '❌ SDK connected but no data received';
        setTestResult(warningMessage);
        Logger.log('Perps: SDK connected but no data received');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const fullErrorMessage = `❌ SDK test failed: ${errorMessage}`;
      setTestResult(fullErrorMessage);
      Logger.log('Perps: SDK test failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testAssetListing = async () => {
    setIsLoading(true);
    setTestResult('');

    try {
      Logger.log('Perps: Testing asset listing...');
      const transport = new HttpTransport();
      const infoClient = new InfoClient({ transport });

      // Test asset listing functionality - get perps meta data
      const perpsMeta = await infoClient.meta();

      if (perpsMeta?.universe && perpsMeta.universe.length > 0) {
        const assets = perpsMeta.universe;
        const successMessage = `✅ Found ${
          assets.length
        } tradeable assets:\n${assets
          .slice(0, 5)
          .map((asset: { name: string }) => asset.name)
          .join(', ')}${assets.length > 5 ? '...' : ''}`;
        setTestResult(successMessage);
        Logger.log('Perps: Asset listing successful', { count: assets.length });
      } else {
        const warningMessage = '❌ No assets found';
        setTestResult(warningMessage);
        Logger.log('Perps: No assets found');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const fullErrorMessage = `❌ Asset listing failed: ${errorMessage}`;
      setTestResult(fullErrorMessage);
      Logger.log('Perps: Asset listing failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testWebSocketConnection = async () => {
    setIsLoading(true);
    setTestResult('');
    let hasReceivedData = false;

    try {
      Logger.log('Perps: Testing WebSocket connection...');
      const transport = new WebSocketTransport();
      const subsClient = new SubscriptionClient({ transport });

      // Test WebSocket connection with a simple subscription
      const subscription = await subsClient.allMids((data) => {
        if (!hasReceivedData) {
          hasReceivedData = true;
          Logger.log('Perps: WebSocket data received', {
            dataKeys: Object.keys(data).length,
          });

          const successMessage = `✅ WebSocket connection successful!\nReceived real-time market data with ${
            Object.keys(data).length
          } assets`;
          setTestResult(successMessage);

          // Unsubscribe after receiving first data
          setTimeout(async () => {
            try {
              await subscription.unsubscribe();
              Logger.log('Perps: WebSocket subscription cleaned up');
              setIsLoading(false);
            } catch (error) {
              Logger.log('Perps: Error unsubscribing', error);
              setIsLoading(false);
            }
          }, 1000);
        }
      });

      // Reduce timeout to 5 seconds and check connection status
      setTimeout(async () => {
        if (!hasReceivedData) {
          try {
            await subscription.unsubscribe();
            const timeoutMessage =
              '⚠️ WebSocket connection timeout - no data received within 5 seconds\nThis might be normal if the market is closed';
            setTestResult(timeoutMessage);
            Logger.log(
              'Perps: WebSocket connection timeout - may be market hours related',
            );
          } catch (error) {
            Logger.log('Perps: Error during timeout cleanup', error);
          }
          setIsLoading(false);
        }
      }, 5000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const fullErrorMessage = `❌ WebSocket test failed: ${errorMessage}`;
      setTestResult(fullErrorMessage);
      Logger.log('Perps: WebSocket test failed', error);
      setIsLoading(false);
    }
  };

  return (
    <ScreenView>
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Text variant={TextVariant.HeadingLG} color={TextColor.Default}>
            Perps Trading (Development)
          </Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
            Test @deeeed/hyperliquid-node20 SDK
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label="Test SDK Connection"
            onPress={testSDKConnection}
            loading={isLoading}
            style={styles.button}
          />

          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label="Test Asset Listing"
            onPress={testAssetListing}
            loading={isLoading}
            style={styles.button}
          />

          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label="Test WebSocket Connection"
            onPress={testWebSocketConnection}
            loading={isLoading}
            style={styles.button}
          />

          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label="View Positions"
            onPress={() =>
              navigation.navigate(Routes.PERPS.POSITIONS_VIEW as never)
            }
          />
        </View>

        {testResult ? (
          <View style={styles.resultContainer}>
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
              Test Result:
            </Text>
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Muted}
              style={styles.resultText}
            >
              {testResult}
            </Text>
          </View>
        ) : null}
      </View>
    </ScreenView>
  );
};

export default PerpsView;
