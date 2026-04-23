import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Image, ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';
import Logger from '../../../../../util/Logger';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const HardwareWalletRive = require('../../../../../animations/hardware_wallet.riv');

const styles = StyleSheet.create({
  riveContainer: {
    width: 240,
    height: 240,
  },
  rive: {
    width: '100%',
    height: '100%',
  },
});

export interface ButtonConfig {
  label: string;
  onPress: () => void;
  testID?: string;
}

export interface LedgerDiscoveryErrorScreenProps {
  /** Static image source (use this for non-animated states) */
  imageSource?: ImageSourcePropType;
  /** Rive artboard to display (only for Ledger artboard with state machine) */
  artboardName?: string;
  /** Rive state machine name — omit for auto-play artboards */
  stateMachineName?: string;
  /** State machine trigger to fire after mount (e.g. 'error', 'ledger_locked') */
  stateTrigger?: string;
  title: string;
  subtitle: string;
  primaryButton?: ButtonConfig;
  secondaryButton?: ButtonConfig;
  testID?: string;
}

const LedgerDiscoveryErrorScreen = ({
  imageSource,
  artboardName,
  stateMachineName,
  stateTrigger,
  title,
  subtitle,
  primaryButton,
  secondaryButton,
  testID,
}: LedgerDiscoveryErrorScreenProps) => {
  const tw = useTailwind();
  const riveRef = useRef<RiveRef>(null);
  const useStaticImage = !!imageSource;

  useEffect(() => {
    if (useStaticImage) {
      Logger.log('Using static image for error screen');
      return;
    }

    Logger.log(`LedgerDiscoveryErrorScreen mounted - artboard: ${artboardName}, stateMachine: ${stateMachineName}, trigger: ${stateTrigger}`);

    if (!stateTrigger || !stateMachineName) {
      Logger.log(`Skipping trigger fire - auto-play artboard: ${artboardName}`);
      return;
    }

    const timeoutId = setTimeout(() => {
      if (riveRef.current) {
        try {
          Logger.log(`Firing state: ${stateMachineName}.${stateTrigger}`);
          riveRef.current.fireState(stateMachineName, stateTrigger);
          Logger.log(`Successfully fired state: ${stateTrigger}`);
        } catch (error) {
          Logger.error(
            error as Error,
            `Error triggering Rive state: ${stateTrigger}`,
          );
        }
      } else {
        Logger.log(`Rive ref not available for trigger: ${stateTrigger}`);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [useStaticImage, artboardName, stateMachineName, stateTrigger]);

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={tw.style('flex-1 bg-default')}
    >
      <Box twClassName="flex-1 bg-default" alignItems={BoxAlignItems.Center}>
        <Box
          alignItems={BoxAlignItems.Center}
          twClassName="flex-1 justify-center"
        >
          <View style={styles.riveContainer}>
            {useStaticImage ? (
              <Image
                source={imageSource}
                style={styles.rive}
                resizeMode="contain"
                testID={testID ?? 'ledger-error-image'}
              />
            ) : (
              <Rive
                ref={riveRef}
                style={styles.rive}
                source={HardwareWalletRive}
                autoplay
                fit={Fit.Contain}
                alignment={Alignment.Center}
                artboardName={artboardName}
                stateMachineName={stateMachineName}
                testID={testID ?? 'ledger-error-animation'}
                onPlay={() =>
                  Logger.log(`✅ Rive ${artboardName} animation started playing`)
                }
                onPause={() =>
                  Logger.log(`⏸️ Rive ${artboardName} animation paused`)
                }
                onStop={() =>
                  Logger.log(`⏹️ Rive ${artboardName} animation stopped`)
                }
                onLoopEnd={() =>
                  Logger.log(`🔁 Rive ${artboardName} animation loop ended`)
                }
                onError={(error) => {
                  Logger.log(`❌ Rive error for artboard "${artboardName}": ${error.message}`);
                }}
              />
            )}
          </View>
        </Box>

        <Box twClassName="w-full gap-4 px-4 pb-6">
          <Box twClassName="gap-2 px-2">
            <Text variant={TextVariant.HeadingLg} twClassName="text-center">
              {title}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {subtitle}
            </Text>
          </Box>

          {primaryButton ? (
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={primaryButton.onPress}
              testID={primaryButton.testID}
            >
              {primaryButton.label}
            </Button>
          ) : null}

          {secondaryButton ? (
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={secondaryButton.onPress}
              testID={secondaryButton.testID}
            >
              {secondaryButton.label}
            </Button>
          ) : null}
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default LedgerDiscoveryErrorScreen;
