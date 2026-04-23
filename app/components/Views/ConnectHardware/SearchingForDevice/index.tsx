import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const HardwareWalletRive = require('../../../../animations/hardware_wallet.riv');

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

interface SearchingForDeviceProps {
  isBluetoothOff?: boolean;
}

const SearchingForDevice = ({ isBluetoothOff = false }: SearchingForDeviceProps) => {
  const tw = useTailwind();
  const riveRef = useRef<RiveRef>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (riveRef.current) {
        try {
          Logger.log('Triggering Ledger searching animation');
          riveRef.current.fireState('Ledger_states', 'reset');
          Logger.log('Successfully fired reset trigger');
        } catch (error) {
          Logger.error(
            error as Error,
            'Error triggering Ledger searching Rive animation',
          );
        }
      } else {
        Logger.log('Rive ref not available for searching animation');
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={tw.style('flex-1 bg-default')}
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="flex-1 bg-default"
      >
        <Box
          alignItems={BoxAlignItems.Center}
          twClassName="px-4"
        >
          <View style={styles.riveContainer}>
            <Rive
              ref={riveRef}
              style={styles.rive}
              source={HardwareWalletRive}
              autoplay
              fit={Fit.Contain}
              alignment={Alignment.Center}
              artboardName="Ledger"
              stateMachineName="Ledger_states"
              testID="ledger-searching-animation"
              onPlay={() => Logger.log('Ledger searching animation started playing')}
              onPause={() => Logger.log('Ledger searching animation paused')}
              onStop={() => Logger.log('Ledger searching animation stopped')}
            />
          </View>
          <Box
            alignItems={BoxAlignItems.Center}
            twClassName="w-full pt-6"
            testID="hardware-wallet-searching-content"
          >
            <Text variant={TextVariant.HeadingLg} twClassName="text-center">
              {isBluetoothOff
                ? strings('ledger.bluetooth_off')
                : strings('ledger.looking_for_device')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.PrimaryAlternative}
              twClassName="pt-2 text-center"
            >
              {isBluetoothOff
                ? strings('ledger.bluetooth_off_message')
                : strings('ledger.wait_while_we_search_for_it')}
            </Text>
          </Box>
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default SearchingForDevice;
