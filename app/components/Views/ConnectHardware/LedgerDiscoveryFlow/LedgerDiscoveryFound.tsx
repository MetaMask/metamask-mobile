import React, { useEffect } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
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
import Logger from '../../../../util/Logger';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const HardwareWalletRive = require('../../../../animations/hardware_wallet.riv');

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
  const { colors } = useTheme();
  const [setRiveRef, riveRef] = useRive();

  useEffect(() => {
    if (riveRef) {
      try {
        riveRef.trigger('found');
      } catch (error) {
        Logger.error(error as Error, 'Error triggering Ledger found Rive animation');
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
          testID="ledger-discovery-found"
        >
          <View style={styles.riveContainer}>
            <Rive
              ref={setRiveRef}
              style={styles.rive}
              source={HardwareWalletRive}
              autoplay
              fit={Fit.Contain}
              alignment={Alignment.Center}
              artboardName="Ledger"
              stateMachineName="Ledger_states"
              dataBinding={AutoBind(true)}
              testID="ledger-found-animation"
            />
          </View>
          <Text variant={TextVariant.HeadingLg} twClassName="text-center pt-6">
            {strings('ledger.device_found')}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onOpenSelectDevice}
            testID="ledger-discovery-device-chip"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="mt-4 rounded-xl bg-muted px-3 py-3"
            >
              <MaterialIcon
                name="smartphone"
                size={20}
                color={colors.text.default}
              />
              <Text variant={TextVariant.BodyMd} twClassName="px-3">
                {deviceName}
              </Text>
              <MaterialIcon
                name="keyboard-arrow-down"
                size={20}
                color={colors.text.default}
              />
            </Box>
          </TouchableOpacity>
        </Box>

        <Box alignItems={BoxAlignItems.Center} twClassName="w-full px-4 pb-8">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={onConnectLedger}
            testID="ledger-discovery-connect-button"
          >
            {strings('ledger.connect_ledger')}
          </Button>
        </Box>
      </Box>
    </SafeAreaView>
  );
};
export default LedgerDiscoveryFoundView;
