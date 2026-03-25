import React from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import BottomSheet from '../../../../component-library/components/BottomSheets/BottomSheet';
import type { DiscoveredDevice } from '../../../../core/HardwareWallet/types';

import HardwareWalletTestIds from '../hardwareWallet.testIds';

const SelectDeviceSheet = ({
  devices,
  selectedDeviceId,
  onClose,
  onSelectDevice,
}: {
  devices: DiscoveredDevice[];
  selectedDeviceId?: string | null;
  onClose: () => void;
  onSelectDevice: (device: DiscoveredDevice) => void;
}) => {
  const tw = useTailwind();

  return (
    <BottomSheet
      testID={HardwareWalletTestIds.DEVICE_SHEET}
      isFullscreen={false}
      onClose={onClose}
      shouldNavigateBack={false}
    >
      <Box twClassName="px-4 pb-4 pt-1">
        <Box twClassName="mb-4 h-1 w-10 self-center rounded-full bg-muted" />
        <Box twClassName="mb-4 flex-row items-center justify-between">
          <Box twClassName="w-10" />
          <Text variant={TextVariant.HeadingMd}>
            {strings('hardware_wallet.ledger_onboarding.select_device_title')}
          </Text>
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            onPress={onClose}
            accessibilityLabel={strings('hardware_wallet.common.cancel')}
          />
        </Box>
        <Box>
          {devices.map((discoveredDevice) => {
            const isSelected = discoveredDevice.id === selectedDeviceId;

            return (
              <Pressable
                key={discoveredDevice.id}
                testID={`${HardwareWalletTestIds.DEVICE_SHEET_ITEM}-${discoveredDevice.id}`}
                accessibilityRole="radio"
                accessibilityLabel={discoveredDevice.name}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelectDevice(discoveredDevice)}
              >
                {({ pressed }) => (
                  <Box
                    twClassName="mb-2 flex-row items-center rounded-2xl bg-muted px-4 py-4"
                    style={tw.style(
                      pressed && 'opacity-80',
                      isSelected && 'border',
                    )}
                  >
                    <Box twClassName="mr-4 h-10 w-10 items-center justify-center rounded-full bg-default">
                      <Icon name={IconName.Hardware} size={IconSize.Md} />
                    </Box>
                    <Box style={tw.style('flex-1')}>
                      <Text
                        variant={TextVariant.BodyMd}
                        fontWeight={FontWeight.Medium}
                      >
                        {discoveredDevice.name}
                      </Text>
                    </Box>
                    {isSelected ? (
                      <Icon name={IconName.Check} size={IconSize.Md} />
                    ) : null}
                  </Box>
                )}
              </Pressable>
            );
          })}
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default SelectDeviceSheet;
