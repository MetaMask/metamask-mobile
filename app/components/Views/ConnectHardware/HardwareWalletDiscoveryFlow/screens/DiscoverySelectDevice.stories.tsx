import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
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
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { DiscoveredDevice } from '../../../../../core/HardwareWallet/types';
import type { DeviceUIConfig } from '../DiscoveryFlow.types';

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 99,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
});

const mockDevices: DiscoveredDevice[] = [
  { id: '1', name: 'Ledger Nano X' },
  { id: '2', name: 'Ledger Nano S Plus' },
  { id: '3', name: 'Ledger Stax' },
];

const mockConfig: DeviceUIConfig = {
  walletType: 'ledger',
  discoveryTimeoutMs: 15000,
  animationSource: 0,
  artboardName: 'searching',
  stateMachineName: 'ledgerDiscovery',
  deviceIcon: IconName.Mobile,
  troubleshootingItems: [],
  errorToStepMap: {},
  accountManager: {
    getAccounts: async () => [],
    unlockAccounts: async () => {
      /* noop */
    },
    forgetDevice: async () => {
      /* noop */
    },
  },
  strings: {
    deviceFound: 'Device found',
    connectButton: 'Connect',
    deviceNotFound: 'Device not found',
    tryAgain: 'Try again',
    selectAccounts: 'Select accounts',
  },
};

const noop = () => {
  /* noop */
};

interface StoryArgs {
  devices: DiscoveredDevice[];
  selectedDeviceId: string;
  onSelectDevice: (device: DiscoveredDevice) => void;
  onClose: () => void;
  onSave: () => void;
  config: DeviceUIConfig;
}

const DiscoverySelectDeviceStory: React.FC<StoryArgs> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  onClose,
  onSave,
  config,
}) => {
  const tw = useTailwind();

  return (
    <SafeAreaView edges={['bottom']} style={styles.sheet}>
      <View style={styles.dragHandle} />
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-4 py-2"
      >
        <Box twClassName="h-10 w-10" />
        <Text variant={TextVariant.HeadingMd} twClassName="flex-1 text-center">
          {strings('ledger.select_device')}
        </Text>
        <TouchableOpacity onPress={onClose} testID="discovery-close-sheet">
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="h-10 w-10"
          >
            <Icon
              name={IconName.Close}
              size={IconSize.Md}
              color={IconColor.IconDefault}
            />
          </Box>
        </TouchableOpacity>
      </Box>

      <View style={tw.style('bg-muted')}>
        {devices.map((hwDevice) => {
          const isSelected = hwDevice.id === selectedDeviceId;
          return (
            <TouchableOpacity
              key={hwDevice.id}
              onPress={() => onSelectDevice(hwDevice)}
              testID={`discovery-device-option-${hwDevice.name
                .toLowerCase()
                .replace(/\s+/g, '-')}`}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="px-4 py-4"
              >
                <Box
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Center}
                  twClassName="mr-4 h-10 w-10 rounded-xl bg-default"
                >
                  <Icon
                    name={config.deviceIcon}
                    size={IconSize.Md}
                    color={IconColor.IconDefault}
                  />
                </Box>
                <Text variant={TextVariant.BodyMd} twClassName="flex-1">
                  {hwDevice.name}
                </Text>
                {isSelected && (
                  <Icon
                    name={IconName.Check}
                    size={IconSize.Md}
                    color={IconColor.IconDefault}
                  />
                )}
              </Box>
            </TouchableOpacity>
          );
        })}
      </View>

      <Box twClassName="px-4 pt-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onSave}
          testID="discovery-save-button"
        >
          {strings('ledger.save_device_selection')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

const DiscoverySelectDeviceMeta = {
  title: 'Views / Connect Hardware / Discovery Select Device',
  component: DiscoverySelectDeviceStory,
  args: {
    devices: mockDevices,
    selectedDeviceId: '1',
    onSelectDevice: noop,
    onClose: noop,
    onSave: noop,
    config: mockConfig,
  },
};

export default DiscoverySelectDeviceMeta;

export const Default = {};

export const NoDeviceSelected = {
  args: {
    selectedDeviceId: '',
  },
};

export const SingleDevice = {
  args: {
    devices: [mockDevices[0]],
    selectedDeviceId: '1',
  },
};
