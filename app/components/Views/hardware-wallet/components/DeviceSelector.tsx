import React from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

import HardwareWalletTestIds from '../hardwareWallet.testIds';

const DeviceSelector = ({
  deviceName,
  disabled,
  onPress,
}: {
  deviceName: string;
  disabled: boolean;
  onPress: () => void;
}) => {
  const tw = useTailwind();

  return (
    <Pressable
      testID={HardwareWalletTestIds.DEVICE_SELECTOR}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) =>
        tw.style(
          'rounded-2xl bg-muted px-4 py-3',
          pressed && !disabled && 'opacity-80',
          disabled && 'opacity-60',
        )
      }
    >
      <Box twClassName="flex-row items-center gap-2">
        <Icon name={IconName.Hardware} size={IconSize.Md} />
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {deviceName}
        </Text>
        <Icon name={IconName.ArrowDown} size={IconSize.Md} />
      </Box>
    </Pressable>
  );
};

export default DeviceSelector;
