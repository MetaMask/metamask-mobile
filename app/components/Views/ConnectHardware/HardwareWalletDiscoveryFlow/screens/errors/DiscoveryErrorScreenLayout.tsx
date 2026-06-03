import React, { useCallback, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
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
import Rive, { Alignment, Fit, type RiveRef } from 'rive-react-native';
import HardwareWalletRive from '../../../../../../animations/hardware_wallet.riv';
import Logger from '../../../../../../util/Logger';
import type { DiscoveryErrorScreenLayoutProps } from './DiscoveryErrorScreen.types';

const styles = StyleSheet.create({
  container: { width: 240, height: 240 },
  fill: { width: '100%', height: '100%' },
});

const DiscoveryErrorScreenLayout = ({
  imageSource,
  artboardName,
  stateMachineName,
  stateTrigger,
  title,
  subtitle,
  primaryButton,
  secondaryButton,
  testID,
}: DiscoveryErrorScreenLayoutProps) => {
  const tw = useTailwind();
  const riveRef = useRef<RiveRef>(null);
  const useStaticImage = Boolean(imageSource);

  const handleRivePlay = useCallback(() => {
    if (!stateTrigger || !stateMachineName) {
      return;
    }

    try {
      riveRef.current?.fireState(stateMachineName, stateTrigger);
    } catch (error) {
      Logger.error(error as Error, 'Error triggering error Rive animation');
    }
  }, [stateMachineName, stateTrigger]);

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
          <View style={styles.container}>
            {useStaticImage ? (
              <Image
                source={imageSource}
                style={styles.fill}
                resizeMode="contain"
                testID={testID ?? 'discovery-error-image'}
              />
            ) : (
              <Rive
                ref={riveRef}
                style={styles.fill}
                source={HardwareWalletRive}
                autoplay
                fit={Fit.Contain}
                alignment={Alignment.Center}
                artboardName={artboardName}
                stateMachineName={stateMachineName}
                onPlay={handleRivePlay}
                testID={testID ?? 'discovery-error-animation'}
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

export default DiscoveryErrorScreenLayout;
