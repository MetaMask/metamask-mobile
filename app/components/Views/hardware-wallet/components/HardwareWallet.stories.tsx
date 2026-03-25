import React from 'react';
import { Box } from '@metamask/design-system-react-native';

import DeviceFoundState from './DeviceFoundState';
import DeviceNotFoundState from './DeviceNotFoundState';
import DeviceSelector from './DeviceSelector';
import LedgerDeviceIllustration from './LedgerDeviceIllustration';
import LookingForDeviceState from './LookingForDeviceState';
import OnboardingTips from './OnboardingTips';
import SelectDeviceSheet from './SelectDeviceSheet';

const HardwareWalletStoriesMeta = {
  title: 'Components / Views / Hardware Wallet',
  argTypes: {
    onOpenSelector: { action: 'onOpenSelector' },
    onPress: { action: 'onPress' },
    onRetry: { action: 'onRetry' },
    onClose: { action: 'onClose' },
    onSelectDevice: { action: 'onSelectDevice' },
  },
};

export default HardwareWalletStoriesMeta;

const ScreenWrapper = ({ children }: { children: React.ReactNode }) => (
  <Box twClassName="min-h-full bg-default px-4 py-6">{children}</Box>
);

export const LookingForDevice = {
  render: () => (
    <ScreenWrapper>
      <LookingForDeviceState />
    </ScreenWrapper>
  ),
};

export const DeviceFound = {
  args: {
    deviceName: 'Ledger Nano X',
    disabled: false,
  },
  render: ({
    deviceName,
    disabled,
    onOpenSelector,
  }: {
    deviceName: string;
    disabled: boolean;
    onOpenSelector: () => void;
  }) => (
    <ScreenWrapper>
      <DeviceFoundState
        deviceName={deviceName}
        disabled={disabled}
        onOpenSelector={onOpenSelector}
      />
    </ScreenWrapper>
  ),
};

export const DeviceNotFound = {
  render: ({ onRetry }: { onRetry: () => void }) => (
    <ScreenWrapper>
      <DeviceNotFoundState onRetry={onRetry} />
    </ScreenWrapper>
  ),
};

export const Selector = {
  args: {
    deviceName: 'Ledger Nano X',
    disabled: false,
  },
  render: ({
    deviceName,
    disabled,
    onPress,
  }: {
    deviceName: string;
    disabled: boolean;
    onPress: () => void;
  }) => (
    <ScreenWrapper>
      <DeviceSelector
        deviceName={deviceName}
        disabled={disabled}
        onPress={onPress}
      />
    </ScreenWrapper>
  ),
};

export const Tips = {
  render: () => (
    <ScreenWrapper>
      <OnboardingTips />
    </ScreenWrapper>
  ),
};

export const IllustrationSearching = {
  render: () => (
    <ScreenWrapper>
      <LedgerDeviceIllustration state="searching" />
    </ScreenWrapper>
  ),
};

export const IllustrationFound = {
  render: () => (
    <ScreenWrapper>
      <LedgerDeviceIllustration state="found" />
    </ScreenWrapper>
  ),
};

export const IllustrationNotFound = {
  render: () => (
    <ScreenWrapper>
      <LedgerDeviceIllustration state="not-found" />
    </ScreenWrapper>
  ),
};

export const DeviceSheet = {
  render: ({
    onClose,
    onSelectDevice,
  }: {
    onClose: () => void;
    onSelectDevice: (device: { id: string; name: string }) => void;
  }) => (
    <ScreenWrapper>
      <SelectDeviceSheet
        devices={[
          { id: 'ledger-nano-x', name: 'Ledger Nano X' },
          { id: 'ledger-flex', name: 'Ledger Flex' },
        ]}
        selectedDeviceId="ledger-nano-x"
        onClose={onClose}
        onSelectDevice={onSelectDevice}
      />
    </ScreenWrapper>
  ),
};
