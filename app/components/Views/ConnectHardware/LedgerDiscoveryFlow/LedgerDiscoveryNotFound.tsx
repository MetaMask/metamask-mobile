import React, { useEffect, useRef } from 'react';
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
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const HardwareWalletRive = require('../../../../animations/hardware_wallet.riv');

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
    width: 240,
    height: 240,
  },
  rive: {
    width: '100%',
    height: '100%',
  },
});

export interface LedgerDiscoveryNotFoundViewProps {
  onBack?: () => void;
  onRetry?: () => void;
}

export const LedgerDiscoveryNotFoundView = ({
  onBack,
  onRetry,
}: LedgerDiscoveryNotFoundViewProps) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const riveRef = useRef<RiveRef>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (riveRef.current) {
        try {
          Logger.log('Triggering Ledger not_found animation');
          riveRef.current.fireState('Ledger_states', 'not_found');
          Logger.log('Successfully fired not_found trigger');
        } catch (error) {
          Logger.error(
            error as Error,
            'Error triggering Ledger not_found Rive animation',
          );
        }
      } else {
        Logger.log('Rive ref not available for not_found animation');
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
        twClassName="flex-1 bg-default pt-4"
        alignItems={BoxAlignItems.Center}
      >
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            testID="ledger-discovery-not-found-back"
          >
            <Box twClassName="h-10 w-10 justify-center">
              <MaterialIcon
                name="arrow-back-ios-new"
                size={20}
                color={colors.text.default}
              />
            </Box>
          </TouchableOpacity>
        ) : null}

        {/* Ledger device animation */}
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="w-full pt-8"
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
              testID="ledger-not-found-animation"
              onPlay={() => Logger.log('Ledger not_found animation started playing')}
              onPause={() => Logger.log('Ledger not_found animation paused')}
              onStop={() => Logger.log('Ledger not_found animation stopped')}
            />
          </View>
        </Box>

        {/* Title + troubleshooting list */}
        <Box twClassName="w-full gap-12 px-4 pt-12">
          <Text variant={TextVariant.HeadingLg} twClassName="text-center w-full">
            {strings('ledger.device_not_found')}
          </Text>

          <Box twClassName="px-4">
            {troubleshootingItems.map((item) => (
              <Box
                key={item.id}
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="py-2"
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

        {onRetry ? (
          <Box twClassName="w-full px-4 pb-4 mt-auto">
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={onRetry}
              testID="ledger-discovery-retry-button"
            >
              {strings('ledger.try_again')}
            </Button>
          </Box>
        ) : null}
      </Box>
    </SafeAreaView>
  );
};

const LedgerDiscoveryNotFound = ({
  onRetry,
}: Pick<LedgerDiscoveryNotFoundViewProps, 'onRetry'>) => (
  <LedgerDiscoveryNotFoundView onRetry={onRetry} />
);

export default LedgerDiscoveryNotFound;
