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
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../../../util/theme';
import type { DiscoveredDevice } from '../../../../core/HardwareWallet/types';
import { strings } from '../../../../../locales/i18n';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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

export interface LedgerDiscoverySelectDeviceViewProps {
  devices: DiscoveredDevice[];
  selectedDeviceId: string;
  onSelectDevice: (device: DiscoveredDevice) => void;
  onClose: () => void;
  onSave: () => void;
}

export const LedgerDiscoverySelectDeviceView = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  onClose,
  onSave,
}: LedgerDiscoverySelectDeviceViewProps) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID="ledger-discovery-select-device-sheet"
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <SafeAreaView
          edges={['bottom']}
          style={[styles.sheet, { backgroundColor: colors.background.alternative }]}
          onStartShouldSetResponder={() => true}
        >
          <View
            style={[styles.dragHandle, { backgroundColor: 'rgba(255, 255, 255, 0.12)' }]}
          />

          {/* Header */}
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
              accessibilityRole="button"
              accessibilityLabel={strings('common.close')}
              testID="ledger-discovery-close-sheet"
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

          {/* Device list */}
          <View style={tw.style('bg-muted')}>
            {devices.map((device) => {
              const isSelected = device.id === selectedDeviceId;
              const deviceTestId = `ledger-discovery-device-option-${device.name
                .toLowerCase()
                .replace(/\s+/g, '-')}`;
              return (
                <TouchableOpacity
                  key={device.id}
                  onPress={() => onSelectDevice(device)}
                  testID={deviceTestId}
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
                      <MaterialIcon
                        name="smartphone"
                        size={20}
                        color={colors.text.alternative}
                      />
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

          {/* Save button */}
          <Box twClassName="px-4 pt-4">
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={onSave}
              testID="ledger-discovery-save-button"
            >
              {strings('ledger.save_device_selection')}
            </Button>
          </Box>
        </SafeAreaView>
      </TouchableOpacity>
    </Modal>
  );
};

export default LedgerDiscoverySelectDeviceView;
