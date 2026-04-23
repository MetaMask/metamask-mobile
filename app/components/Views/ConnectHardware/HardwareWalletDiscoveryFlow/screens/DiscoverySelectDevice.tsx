import React from 'react';
import { Modal, TouchableOpacity, View, StyleSheet } from 'react-native';
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
import { useTheme } from '../../../../../util/theme';
import type { DiscoveredDevice } from '../../../../../core/HardwareWallet/types';
import type { DeviceUIConfig } from '../DiscoveryFlow.types';
import { strings } from '../../../../../../locales/i18n';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
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

interface DiscoverySelectDeviceScreenProps {
  devices: DiscoveredDevice[];
  selectedDeviceId: string;
  onSelectDevice: (device: DiscoveredDevice) => void;
  onClose: () => void;
  onSave: () => void;
  config: DeviceUIConfig;
}

const DiscoverySelectDeviceScreen: React.FC<DiscoverySelectDeviceScreenProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  onClose,
  onSave,
  config,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID="discovery-select-device-sheet"
    >
      <TouchableOpacity
        style={[
          styles.overlay,
          { backgroundColor: colors.overlay?.default ?? 'rgba(0,0,0,0.6)' },
        ]}
        activeOpacity={1}
        onPress={onClose}
      >
        <SafeAreaView
          edges={['bottom']}
          style={[
            styles.sheet,
            { backgroundColor: colors.background.alternative },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.dragHandle} />
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="px-4 py-2"
          >
            <Box twClassName="h-10 w-10" />
            <Text
              variant={TextVariant.HeadingMd}
              twClassName="flex-1 text-center"
            >
              {strings('ledger.select_device')}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              testID="discovery-close-sheet"
            >
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
                      <Icon name={IconName.Watch} size={IconSize.Md} />
                    </Box>
                    <Text variant={TextVariant.BodyMd} twClassName="flex-1">
                      {device.name}
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
      </TouchableOpacity>
    </Modal>
  );
};

export default DiscoverySelectDeviceScreen;
