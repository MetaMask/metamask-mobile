import React from 'react';
import { View, StyleSheet } from 'react-native';
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
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Rive, { Alignment, Fit, AutoBind, useRive } from 'rive-react-native';
import Logger from '../../../../../util/Logger';
import { useTheme } from '../../../../../util/theme';
import type { DeviceUIConfig } from '../DiscoveryFlow.types';

const styles = StyleSheet.create({
  riveContainer: { width: 360, height: 360 },
  rive: { width: '100%', height: '100%' },
});

interface DiscoveryFoundScreenProps {
  config: DeviceUIConfig;
  deviceName: string;
  onOpenSelectDevice: () => void;
  onConnect: () => void;
}

const DiscoveryFoundScreen: React.FC<DiscoveryFoundScreenProps> = ({
  config,
  deviceName,
  onOpenSelectDevice,
  onConnect,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const [setRiveRef, riveRef] = useRive();

  React.useEffect(() => {
    if (riveRef) {
      try {
        riveRef.trigger('found');
      } catch (error) {
        Logger.error(error as Error, 'Error triggering found Rive animation');
      }
    }
  }, [riveRef]);

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
              ref={setRiveRef}
              style={styles.rive}
              source={config.animationSource}
              autoplay
              fit={Fit.Contain}
              alignment={Alignment.Center}
              artboardName={config.artboardName}
              stateMachineName={config.stateMachineName}
              dataBinding={AutoBind(true)}
              testID="discovery-found-animation"
            />
          </View>
          <Text variant={TextVariant.HeadingLg} twClassName="text-center pt-6">
            {config.strings.deviceFound}
          </Text>
          <MaterialIcon.Button
            name={config.deviceIcon}
            size={20}
            color={colors.text.default}
            backgroundColor="transparent"
            onPress={onOpenSelectDevice}
            testID="discovery-device-chip"
          >
            {deviceName}
          </MaterialIcon.Button>
        </Box>
        <Box alignItems={BoxAlignItems.Center} twClassName="w-full px-4 pb-8">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
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
