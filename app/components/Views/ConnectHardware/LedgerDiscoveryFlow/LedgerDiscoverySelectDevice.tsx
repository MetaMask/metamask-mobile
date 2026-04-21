import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';
import Logger from '../../../../util/Logger';
import HardwareWalletRive from '../../../../animations/hardware_wallet.riv';
import type { BluetoothDevice } from '../../../hooks/Ledger/useBluetoothDevices';
import { strings } from '../../../../../locales/i18n';

const styles = StyleSheet.create({
  riveContainer: {
    width: 280,
    height: 280,
  },
  rive: {
    width: '100%',
    height: '100%',
  },
});

export interface LedgerDiscoverySelectDeviceViewProps {
  devices: BluetoothDevice[];
  selectedDeviceId: string;
  onSelectDevice: (device: BluetoothDevice) => void;
  onClose: () => void;
  onSave: () => void;
}

export const LedgerDiscoverySelectDeviceView = ({
  devices: _devices,
  selectedDeviceId: _selectedDeviceId,
  onSelectDevice: _onSelectDevice,
  onClose: _onClose,
  onSave: _onSave,
}: LedgerDiscoverySelectDeviceViewProps) => {
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
      <Box
        flexDirection={BoxFlexDirection.Column}
        justifyContent={BoxJustifyContent.Center}
      >
        <View style={styles.riveContainer}>
          <Rive
            ref={riveRef}
            style={styles.rive}
            source={HardwareWalletRive}
            fit={Fit.Contain}
            alignment={Alignment.Center}
            artboardName="Ledger_states"
            stateMachineName="Ledger_states"
            testID="ledger-select-device-animation"
            onPlay={() => {
              setIsPlaying(true);
            }}
          />
        </View>
        <Text variant={TextVariant.HeadingLg} twClassName="text-center">
          {strings('ledger.device_found')}
        </Text>
      </Box>
    </SafeAreaView>
  );
};
export default LedgerDiscoverySelectDeviceView;
