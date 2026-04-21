import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';
import Logger from '../../../../util/Logger';
import HardwareWalletRive from '../../../../animations/hardware_wallet.riv';

export interface LedgerDiscoveryFoundViewProps {
  deviceName: string;
  onOpenSelectDevice: () => void;
  onConnectLedger: () => void;
}

const styles = StyleSheet.create({
  riveContainer: {
    width: 360,
    height: 360,
  },
  rive: {
    width: '100%',
    height: '100%',
  },
});

export const LedgerDiscoveryFoundView = ({
  deviceName,
  onOpenSelectDevice,
  onConnectLedger,
}: LedgerDiscoveryFoundViewProps) => {
  const tw = useTailwind();
  const riveRef = useRef<RiveRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const fireFoundState = useCallback(() => {
    if (riveRef.current) {
      try {
        riveRef.current.fireState('Ledger_states', 'found');
      } catch (error) {
        Logger.error(
          error as Error,
          'Error triggering Ledger found Rive animation',
        );
      }
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      fireFoundState();
    }
  }, [isPlaying, fireFoundState]);

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={tw.style('flex-1 bg-default')}
    >
      <Box alignItems={BoxAlignItems.Center} twClassName="flex-1 bg-default">
        <Box alignItems={BoxAlignItems.Center} twClassName="flex-1 px-4 pt-16">
          <View style={styles.riveContainer}>
            <Rive
              ref={riveRef}
              style={styles.rive}
              source={HardwareWalletRive}
              fit={Fit.Contain}
              alignment={Alignment.Center}
              artboardName="Ledger_states"
              stateMachineName="Ledger_states"
              testID="ledger-found-animation"
              onPlay={() => {
                setIsPlaying(true);
              }}
            />
          </View>
        </Box>

        <Box
          alignItems={BoxAlignItems.Center}
          twClassName="w-full gap-4 px-4 pb-8"
          testID="ledger-discovery-found"
        >
          <Text variant={TextVariant.HeadingLg} twClassName="text-center">
            Ledger device found
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={onOpenSelectDevice}
            testID="ledger-discovery-device-chip"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="rounded-xl bg-muted px-3 py-3"
            >
              <MaterialIcon name="smartphone" size={20} color="#FFFFFF" />
              <Text variant={TextVariant.BodyMd} twClassName="px-3">
                {deviceName}
              </Text>
              <MaterialIcon
                name="keyboard-arrow-down"
                size={20}
                color="#FFFFFF"
              />
            </Box>
          </TouchableOpacity>

          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={onConnectLedger}
            testID="ledger-discovery-connect-button"
          >
            Connect Ledger
          </Button>
        </Box>
      </Box>
    </SafeAreaView>
  );
};
export default LedgerDiscoveryFoundView;
