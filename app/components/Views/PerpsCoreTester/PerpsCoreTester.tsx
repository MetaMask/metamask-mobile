/**
 * PerpsCoreTester
 *
 * Standalone debug screen to test Core PerpsController integration
 * WITHOUT requiring Perps providers or environment setup.
 *
 * This is a minimal test screen for:
 * 1. Calling PerpsController.debug() method
 * 2. Fetching markets via getMarkets()
 *
 * Output is logged to Metro console for easy copy/paste.
 */
import React, { useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './PerpsCoreTester.styles';
import Engine from '../../../core/Engine';
import DevLogger from '../../../core/SDKConnect/utils/DevLogger';

// Version marker for this test view
const TEST_VIEW_VERSION = '1.1.0';

const PerpsCoreTester: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const [isLoading, setIsLoading] = useState<{
    debug: boolean;
    markets: boolean;
  }>({ debug: false, markets: false });

  const handleCallDebug = useCallback(() => {
    setIsLoading((prev) => ({ ...prev, debug: true }));

    try {
      const { PerpsController } = Engine.context;
      const result = PerpsController.debug();
      DevLogger.log(
        '[CoreTester] debug() result:',
        JSON.stringify(result, null, 2),
      );
    } catch (error) {
      DevLogger.log(
        '[CoreTester] debug() error:',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, debug: false }));
    }
  }, []);

  const handleFetchMarkets = useCallback(async () => {
    setIsLoading((prev) => ({ ...prev, markets: true }));

    try {
      const { PerpsController } = Engine.context;
      // Use readOnly: true to avoid CLIENT_NOT_INITIALIZED error
      const markets = await PerpsController.getMarkets({ readOnly: true });
      DevLogger.log(
        '[CoreTester] getMarkets() result:',
        JSON.stringify(markets, null, 2),
      );
    } catch (error) {
      DevLogger.log(
        '[CoreTester] getMarkets() error:',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, markets: false }));
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text variant={TextVariant.HeadingLG} style={styles.title}>
            Core Controller Tester
          </Text>
          <Text variant={TextVariant.BodyMD} style={styles.subtitle}>
            Standalone test screen for PerpsController
          </Text>
          <View style={styles.versionBadge}>
            <Text variant={TextVariant.BodySMBold} style={styles.versionText}>
              v{TEST_VIEW_VERSION}
            </Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text variant={TextVariant.BodyMD} style={styles.infoText}>
            This screen tests PerpsController directly from Engine.context.
            Check Metro console for output.
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant={TextVariant.HeadingMD} style={styles.sectionTitle}>
            Actions
          </Text>

          <TouchableOpacity
            style={[styles.button, isLoading.debug && styles.buttonDisabled]}
            onPress={handleCallDebug}
            disabled={isLoading.debug}
          >
            <Text
              variant={TextVariant.BodyMDBold}
              style={[
                styles.buttonText,
                isLoading.debug && styles.buttonTextDisabled,
              ]}
            >
              {isLoading.debug ? 'Calling...' : 'Call debug()'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isLoading.markets && styles.buttonDisabled]}
            onPress={handleFetchMarkets}
            disabled={isLoading.markets}
          >
            <Text
              variant={TextVariant.BodyMDBold}
              style={[
                styles.buttonText,
                isLoading.markets && styles.buttonTextDisabled,
              ]}
            >
              {isLoading.markets ? 'Fetching...' : 'Fetch Markets'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PerpsCoreTester;
