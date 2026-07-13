import React, { useCallback, useRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  BottomSheet,
  BottomSheetHeader,
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
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import type { DiscoveredDevice } from '../../../../../core/HardwareWallet/types';
import type { DeviceUIConfig } from '../DiscoveryFlow.types';
import { strings } from '../../../../../../locales/i18n';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';

interface DiscoverySelectDeviceScreenProps {
  devices: DiscoveredDevice[];
  selectedDeviceId: string;
  onSelectDevice: (device: DiscoveredDevice) => void;
  onClose: () => void;
  onSave: () => void;
  config: DeviceUIConfig;
}

const DiscoverySelectDeviceScreen: React.FC<
  DiscoverySelectDeviceScreenProps
> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  onClose,
  onSave,
  config,
}) => {
  const tw = useTailwind();
  const surfaceClass = useElevatedSurface();
  const sheetRef = useRef<BottomSheetRef>(null);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={onClose}
      twClassName={surfaceClass}
      testID="discovery-select-device-sheet"
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: 'discovery-close-sheet',
        }}
      >
        <Text variant={TextVariant.HeadingMd}>
          {strings('ledger.select_device')}
        </Text>
      </BottomSheetHeader>

      <View style={tw.style('bg-muted')}>
        {devices.map((hwDevice) => {
          const isSelected = hwDevice.id === selectedDeviceId;
          return (
            <TouchableOpacity
              key={hwDevice.id}
              onPress={() => onSelectDevice(hwDevice)}
              testID={`discovery-device-option-${hwDevice.id}`}
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
                    testID={`discovery-device-selected-${hwDevice.id}`}
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
    </BottomSheet>
  );
};

export default DiscoverySelectDeviceScreen;
