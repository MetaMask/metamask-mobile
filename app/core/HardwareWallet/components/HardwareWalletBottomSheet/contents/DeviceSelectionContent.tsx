/**
 * Device Selection Content Component
 *
 * Displays a list of discovered Bluetooth devices for user selection.
 * Used during the device scanning phase of hardware wallet connection.
 */

import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';

import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';

import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { Colors } from '../../../../../util/theme/models';
import { HardwareWalletType } from '../../../helpers';
import { DiscoveredDevice } from '../../../types';

// Test IDs
export const DEVICE_SELECTION_CONTENT_TEST_ID = 'device-selection-content';
export const DEVICE_SELECTION_ITEM_TEST_ID = 'device-selection-item';
export const DEVICE_SELECTION_EMPTY_TEST_ID = 'device-selection-empty';
export const DEVICE_SELECTION_SCANNING_TEST_ID = 'device-selection-scanning';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    iconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      marginTop: 8,
    },
    titleContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      textAlign: 'center',
    },
    scanningContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      marginBottom: 8,
    },
    scanningText: {
      marginLeft: 12,
    },
    deviceList: {
      maxHeight: 300,
      marginBottom: 16,
    },
    deviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: colors.background.alternative,
    },
    deviceItemSelected: {
      borderWidth: 2,
      borderColor: colors.primary.default,
      backgroundColor: colors.primary.muted,
    },
    deviceIconContainer: {
      marginRight: 16,
    },
    deviceInfo: {
      flex: 1,
    },
    deviceName: {
      marginBottom: 2,
    },
    deviceModel: {
      // Empty style for future use
    },
    checkmarkContainer: {
      marginLeft: 8,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyText: {
      textAlign: 'center',
      marginBottom: 8,
    },
    emptySubtext: {
      textAlign: 'center',
    },
    buttonContainer: {
      marginTop: 8,
      width: '100%',
    },
    buttonSpacing: {
      marginBottom: 8,
    },
    tipsContainer: {
      marginBottom: 16,
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.background.alternative,
    },
    tipText: {
      lineHeight: 20,
    },
  });

export interface DeviceSelectionContentProps {
  /** List of discovered devices */
  devices: DiscoveredDevice[];
  /** Currently selected device (if any) */
  selectedDevice?: DiscoveredDevice;
  /** Whether scanning is in progress */
  isScanning: boolean;
  /** The device type for context in messages */
  deviceType?: HardwareWalletType;
  /** Callback when a device is selected */
  onSelectDevice: (device: DiscoveredDevice) => void;
  /** Callback when user confirms selection */
  onConfirmSelection: () => void;
  /** Callback when user wants to rescan */
  onRescan?: () => void;
  /** Optional callback when user wants to cancel */
  onCancel?: () => void;
}

/**
 * Content component for selecting a discovered hardware wallet device.
 * Shows a list of available devices with selection highlighting.
 */
export const DeviceSelectionContent: React.FC<DeviceSelectionContentProps> = ({
  devices,
  selectedDevice,
  isScanning,
  deviceType = HardwareWalletType.Ledger,
  onSelectDevice,
  onConfirmSelection,
  onRescan,
  onCancel,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Get device-specific name for display
  const deviceName = useMemo(
    () => strings(`hardware_wallet.device_names.${deviceType.toLowerCase()}`),
    [deviceType],
  );

  const renderDevice = ({ item }: { item: DiscoveredDevice }) => {
    const isSelected = selectedDevice?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.deviceItem, isSelected && styles.deviceItemSelected]}
        onPress={() => onSelectDevice(item)}
        testID={`${DEVICE_SELECTION_ITEM_TEST_ID}-${item.id}`}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${item.name}${isSelected ? ', selected' : ''}`}
      >
        <View style={styles.deviceIconContainer}>
          <Icon
            name={IconName.Hardware}
            size={IconSize.Lg}
            color={isSelected ? IconColor.Primary : IconColor.Default}
          />
        </View>
        <View style={styles.deviceInfo}>
          <Text
            variant={TextVariant.BodyMDBold}
            color={isSelected ? TextColor.Primary : TextColor.Default}
            style={styles.deviceName}
          >
            {item.name ||
              strings('hardware_wallet.device_selection.unknown_device')}
          </Text>
          {item.metadata?.rssi !== undefined && (
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Default}
              style={styles.deviceModel}
            >
              {strings('hardware_wallet.device_selection.signal_strength', {
                rssi: item.metadata.rssi,
              })}
            </Text>
          )}
        </View>
        {isSelected && (
          <View style={styles.checkmarkContainer}>
            <Icon
              name={IconName.Check}
              size={IconSize.Md}
              color={IconColor.Primary}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer} testID={DEVICE_SELECTION_EMPTY_TEST_ID}>
      <Icon
        name={IconName.Search}
        size={IconSize.Xl}
        color={IconColor.Alternative}
        style={styles.emptyIcon}
      />
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Default}
        style={styles.emptyText}
      >
        {isScanning
          ? strings('hardware_wallet.device_selection.scanning')
          : strings('hardware_wallet.device_selection.no_devices_found')}
      </Text>
      {!isScanning && (
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Default}
          style={styles.emptySubtext}
        >
          {strings('hardware_wallet.device_selection.no_devices_hint', {
            device: deviceName,
          })}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container} testID={DEVICE_SELECTION_CONTENT_TEST_ID}>
      {/* Icon */}
      <View style={styles.iconContainer}>
        <Icon
          name={IconName.Hardware}
          size={IconSize.Xl}
          color={IconColor.Primary}
        />
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={styles.title}
        >
          {strings('hardware_wallet.device_selection.title', {
            device: deviceName,
          })}
        </Text>
      </View>

      {/* Scanning indicator */}
      {isScanning && (
        <View
          style={styles.scanningContainer}
          testID={DEVICE_SELECTION_SCANNING_TEST_ID}
        >
          <ActivityIndicator color={colors.primary.default} />
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Default}
            style={styles.scanningText}
          >
            {strings('hardware_wallet.device_selection.scanning')}
          </Text>
        </View>
      )}

      {/* Tips */}
      <View style={styles.tipsContainer}>
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Default}
          style={styles.tipText}
        >
          {strings('hardware_wallet.device_selection.tips', {
            device: deviceName,
          })}
        </Text>
      </View>

      {/* Device list */}
      {devices.length > 0 ? (
        <FlatList
          data={devices}
          renderItem={renderDevice}
          keyExtractor={(item) => item.id}
          style={styles.deviceList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmpty()
      )}

      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        {selectedDevice && (
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('hardware_wallet.device_selection.connect')}
            onPress={onConfirmSelection}
            style={styles.buttonSpacing}
          />
        )}
        {onRescan && !isScanning && (
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('hardware_wallet.device_selection.rescan')}
            onPress={onRescan}
            style={styles.buttonSpacing}
          />
        )}
        {onCancel && (
          <Button
            variant={ButtonVariants.Link}
            size={ButtonSize.Lg}
            label={strings('hardware_wallet.common.cancel')}
            onPress={onCancel}
          />
        )}
      </View>
    </View>
  );
};

export default DeviceSelectionContent;
