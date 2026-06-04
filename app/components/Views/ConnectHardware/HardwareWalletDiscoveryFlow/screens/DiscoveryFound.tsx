import React, { useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';
import Logger from '../../../../../util/Logger';
import type { DeviceUIConfig } from '../DiscoveryFlow.types';

const styles = StyleSheet.create({
  riveContainer: { width: 360, height: 360 },
  rive: { width: '100%', height: '100%' },
});

interface DiscoveryFoundScreenProps {
  config: DeviceUIConfig;
  deviceName: string;
  deviceCount?: number;
  isConnecting?: boolean;
  onOpenSelectDevice: () => void;
  onConnect: () => void;
}

const DiscoveryFoundScreen: React.FC<DiscoveryFoundScreenProps> = ({
  config,
  deviceName,
  deviceCount = 1,
  isConnecting = false,
  onOpenSelectDevice,
  onConnect,
}) => {
  const tw = useTailwind();
  const riveRef = useRef<RiveRef>(null);

  const handleRivePlay = useCallback(() => {
    try {
      riveRef.current?.setInputState(config.stateMachineName, 'found', true);
    } catch (error) {
      Logger.error(error as Error, 'Error triggering found Rive animation');
    }
  }, [config.stateMachineName]);

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={tw.style('flex-1 bg-default')}
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="flex-1 bg-default"
      >
        <Box
          alignItems={BoxAlignItems.Center}
          twClassName="px-4 pt-16"
          testID="discovery-found"
        >
          <View style={styles.riveContainer}>
            <Rive
              ref={riveRef}
              style={styles.rive}
              source={config.animationSource}
              autoplay
              fit={Fit.Contain}
              alignment={Alignment.Center}
              artboardName={config.artboardName}
              stateMachineName={config.stateMachineName}
              onPlay={handleRivePlay}
              testID="discovery-found-animation"
            />
          </View>
          <Text variant={TextVariant.HeadingLg} twClassName="text-center pt-6">
            {config.strings.deviceFound}
          </Text>
          {deviceCount > 1 ? (
            <TouchableOpacity
              onPress={isConnecting ? undefined : onOpenSelectDevice}
              testID="discovery-device-chip"
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="mt-4 rounded-full bg-muted py-2 px-4"
              >
                <Icon
                  name={config.deviceIcon}
                  size={IconSize.Sm}
                  color={IconColor.IconDefault}
                />
                <Text variant={TextVariant.BodyMd} twClassName="ml-2">
                  {deviceName}
                </Text>
                <Icon
                  name={IconName.ArrowDown}
                  size={IconSize.Sm}
                  color={IconColor.IconDefault}
                  twClassName="ml-2"
                />
              </Box>
            </TouchableOpacity>
          ) : (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="mt-4 rounded-full bg-muted py-2 px-4"
              testID="discovery-device-chip"
            >
              <Icon
                name={config.deviceIcon}
                size={IconSize.Sm}
                color={IconColor.IconDefault}
              />
              <Text variant={TextVariant.BodyMd} twClassName="ml-2">
                {deviceName}
              </Text>
            </Box>
          )}
        </Box>
        <Box alignItems={BoxAlignItems.Center} twClassName="w-full px-4 pb-8">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isLoading={isConnecting}
            isDisabled={isConnecting}
            onPress={onConnect}
            testID="discovery-connect-button"
          >
            {config.strings.connectButton}
          </Button>
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default DiscoveryFoundScreen;
