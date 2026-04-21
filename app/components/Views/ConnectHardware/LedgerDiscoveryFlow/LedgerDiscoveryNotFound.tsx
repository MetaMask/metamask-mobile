import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';
import Logger from '../../../../util/Logger';
import HardwareWalletRive from '../../../../animations/hardware_wallet.riv';
import { strings } from '../../../../../locales/i18n';

export interface LedgerDiscoveryNotFoundViewProps {
  onBack: () => void;
}

const troubleshootingItems = [
  {
    id: 'lock',
    icon: IconName.LockSlash,
    label: strings('ledger.unlock_ledger_device'),
  },
  {
    id: 'ethereum',
    icon: IconName.Ethereum,
    label: strings('ledger.install_and_open_eth_app'),
  },
  {
    id: 'bluetooth',
    icon: IconName.Connect,
    label: strings('ledger.enable_bluetooth'),
  },
  {
    id: 'dnd',
    icon: IconName.VolumeOff,
    label: strings('ledger.turn_off_do_not_disturb'),
  },
] as const;

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

export const LedgerDiscoveryNotFoundView = ({
  onBack,
}: LedgerDiscoveryNotFoundViewProps) => {
  const tw = useTailwind();
  const riveRef = useRef<RiveRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const fireNotFoundState = useCallback(() => {
    if (riveRef.current) {
      try {
        riveRef.current.fireState('Ledger_states', 'not_found');
      } catch (error) {
        Logger.error(
          error as Error,
          'Error triggering Ledger not_found Rive animation',
        );
      }
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      fireNotFoundState();
    }
  }, [isPlaying, fireNotFoundState]);

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={tw.style('flex-1 bg-default')}
    >
      <Box twClassName="flex-1 bg-default px-4 pt-4">
        <TouchableOpacity
          onPress={onBack}
          testID="ledger-discovery-not-found-back"
        >
          <Box twClassName="h-10 w-10 justify-center">
            <MaterialIcon name="arrow-back-ios-new" size={20} color="#FFFFFF" />
          </Box>
        </TouchableOpacity>

        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="w-full overflow-hidden pt-8"
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
              testID="ledger-not-found-animation"
              onPlay={() => {
                setIsPlaying(true);
              }}
            />
          </View>
        </Box>

        <Box alignItems={BoxAlignItems.Center} twClassName="pt-6">
          <Text variant={TextVariant.HeadingLg} twClassName="text-center">
            {strings('ledger.device_not_found')}
          </Text>
        </Box>

        <Box twClassName="pt-6">
          {troubleshootingItems.map((item) => (
            <Box
              key={item.id}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="py-3"
            >
              <Box
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Center}
                twClassName="mr-4 h-10 w-10 rounded-full bg-muted"
              >
                <Icon
                  name={item.icon}
                  size={IconSize.Md}
                  color={IconColor.IconAlternative}
                />
              </Box>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.PrimaryAlternative}
              >
                {item.label}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    </SafeAreaView>
  );
};

const LedgerDiscoveryNotFound = () => {
  const navigation = useNavigation();

  return <LedgerDiscoveryNotFoundView onBack={navigation.goBack} />;
};

export default LedgerDiscoveryNotFound;
