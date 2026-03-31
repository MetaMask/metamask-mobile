import React from 'react';
import { ErrorCode } from '@metamask/hw-wallet-sdk';
import { Box, ButtonVariant } from '@metamask/design-system-react-native';

import DeviceFoundState from './DeviceFoundState';
import DeviceNotFoundState from './DeviceNotFoundState';
import DeviceSelector from './DeviceSelector';
import LedgerDeviceIllustration from './LedgerDeviceIllustration';
import LookingForDeviceState from './LookingForDeviceState';
import OnboardingTips from './OnboardingTips';
import SelectDeviceSheet from './SelectDeviceSheet';
import AccountSelectionFlow, {
  type AccountSelectionItem,
} from './AccountSelectionFlow';
import {
  LedgerConnectionError,
  LedgerAppClosedError,
  LedgerBlindSigningDisabledError,
  LedgerDeviceUnresponsiveError,
  LedgerGenericError,
  ErrorState,
} from '../errors';

type ConnectionStoryErrorCode =
  | ErrorCode.PermissionBluetoothDenied
  | ErrorCode.PermissionLocationDenied
  | ErrorCode.PermissionNearbyDevicesDenied
  | ErrorCode.BluetoothDisabled
  | ErrorCode.BluetoothConnectionFailed;

const MOCK_ACCOUNTS: AccountSelectionItem[] = [
  {
    address: '0x1234...abcd',
    index: 0,
    isExistingAccount: true,
    isSelected: true,
    totalBalance: '$1,234.56',
    assets: [
      {
        address: '0x0000...0000',
        balance: '1.234 ETH',
        iconSource: { uri: 'https://metamask.github.io/images/ethereum.svg' },
        kind: 'network',
        label: 'Ethereum',
        title: 'Ethereum',
      },
      {
        address: '0xabc...def',
        balance: '500 USDC',
        iconSource: { uri: 'https://metamask.github.io/images/usdc.svg' },
        kind: 'token',
        title: 'USD Coin',
      },
    ],
  },
  {
    address: '0x5678...efgh',
    index: 1,
    isExistingAccount: false,
    isSelected: false,
    totalBalance: '$0.00',
    assets: [],
  },
  {
    address: '0x9abc...ijkl',
    index: 2,
    isExistingAccount: false,
    isSelected: true,
    totalBalance: '$89.12',
    assets: [
      {
        address: '0x0000...0000',
        balance: '0.05 ETH',
        iconSource: { uri: 'https://metamask.github.io/images/ethereum.svg' },
        kind: 'network',
        title: 'Ethereum',
      },
    ],
  },
];

const HardwareWalletStoriesMeta = {
  title: 'Components / Views / Hardware Wallet',
  argTypes: {
    onOpenSelector: { action: 'onOpenSelector' },
    onPress: { action: 'onPress' },
    onRetry: { action: 'onRetry' },
    onContinue: { action: 'onContinue' },
    onOpenSettings: { action: 'onOpenSettings' },
    onOpenBluetoothSettings: { action: 'onOpenBluetoothSettings' },
    onClose: { action: 'onClose' },
    onSelectDevice: { action: 'onSelectDevice' },
    onBack: { action: 'onBack' },
    onForget: { action: 'onForget' },
    onNextPage: { action: 'onNextPage' },
    onPrevPage: { action: 'onPrevPage' },
    onToggleAccount: { action: 'onToggleAccount' },
    onExit: { action: 'onExit' },
  },
};

export default HardwareWalletStoriesMeta;

const ScreenWrapper = ({ children }: { children: React.ReactNode }) => (
  <Box twClassName="min-h-full bg-default px-4 py-6">{children}</Box>
);

// ── Device Connection States ──────────────────────────────────────────

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

// ── Device Illustrations ──────────────────────────────────────────────

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

// ── Device Sheet ──────────────────────────────────────────────────────

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

// ── Account Selection ─────────────────────────────────────────────────

export const AccountSelection = {
  args: {
    isBusy: false,
    errorMessage: null,
  },
  render: ({
    isBusy,
    errorMessage,
    onBack,
    onContinue,
    onForget,
    onNextPage,
    onOpenSettings,
    onPrevPage,
    onToggleAccount,
  }: {
    isBusy: boolean;
    errorMessage: string | null;
    onBack: () => void;
    onContinue: () => void;
    onForget: () => void;
    onNextPage: () => void;
    onOpenSettings: () => void;
    onPrevPage: () => void;
    onToggleAccount: (index: number) => void;
  }) => (
    <AccountSelectionFlow
      accounts={MOCK_ACCOUNTS}
      errorMessage={errorMessage}
      isBusy={isBusy}
      onBack={onBack}
      onContinue={onContinue}
      onForget={onForget}
      onNextPage={onNextPage}
      onOpenSettings={onOpenSettings}
      onPrevPage={onPrevPage}
      onToggleAccount={onToggleAccount}
    />
  ),
};

export const AccountSelectionEmpty = {
  render: ({
    onBack,
    onContinue,
    onForget,
    onNextPage,
    onOpenSettings,
    onPrevPage,
    onToggleAccount,
  }: {
    onBack: () => void;
    onContinue: () => void;
    onForget: () => void;
    onNextPage: () => void;
    onOpenSettings: () => void;
    onPrevPage: () => void;
    onToggleAccount: (index: number) => void;
  }) => (
    <AccountSelectionFlow
      accounts={[]}
      errorMessage={null}
      isBusy={false}
      onBack={onBack}
      onContinue={onContinue}
      onForget={onForget}
      onNextPage={onNextPage}
      onOpenSettings={onOpenSettings}
      onPrevPage={onPrevPage}
      onToggleAccount={onToggleAccount}
    />
  ),
};

export const AccountSelectionError = {
  render: ({
    onBack,
    onContinue,
    onForget,
    onNextPage,
    onOpenSettings,
    onPrevPage,
    onToggleAccount,
  }: {
    onBack: () => void;
    onContinue: () => void;
    onForget: () => void;
    onNextPage: () => void;
    onOpenSettings: () => void;
    onPrevPage: () => void;
    onToggleAccount: (index: number) => void;
  }) => (
    <AccountSelectionFlow
      accounts={MOCK_ACCOUNTS}
      errorMessage="Failed to retrieve account balances."
      isBusy={false}
      onBack={onBack}
      onContinue={onContinue}
      onForget={onForget}
      onNextPage={onNextPage}
      onOpenSettings={onOpenSettings}
      onPrevPage={onPrevPage}
      onToggleAccount={onToggleAccount}
    />
  ),
};

export const AccountSelectionBusy = {
  render: ({
    onBack,
    onContinue,
    onForget,
    onNextPage,
    onOpenSettings,
    onPrevPage,
    onToggleAccount,
  }: {
    onBack: () => void;
    onContinue: () => void;
    onForget: () => void;
    onNextPage: () => void;
    onOpenSettings: () => void;
    onPrevPage: () => void;
    onToggleAccount: (index: number) => void;
  }) => (
    <AccountSelectionFlow
      accounts={MOCK_ACCOUNTS}
      errorMessage={null}
      isBusy
      onBack={onBack}
      onContinue={onContinue}
      onForget={onForget}
      onNextPage={onNextPage}
      onOpenSettings={onOpenSettings}
      onPrevPage={onPrevPage}
      onToggleAccount={onToggleAccount}
    />
  ),
};

// ── Connection Errors ─────────────────────────────────────────────────

const renderConnectionErrorStory = (
  errorCode: ConnectionStoryErrorCode,
  {
    isBusy,
    onRetry,
    onContinue,
    onOpenSettings,
    onOpenBluetoothSettings,
  }: {
    isBusy?: boolean;
    onRetry: () => void;
    onContinue: () => void;
    onOpenSettings: () => void;
    onOpenBluetoothSettings: () => void;
  },
) => (
  <ScreenWrapper>
    <LedgerConnectionError
      errorCode={errorCode}
      isBusy={isBusy}
      onRetry={onRetry}
      onContinue={onContinue}
      onOpenSettings={onOpenSettings}
      onOpenBluetoothSettings={onOpenBluetoothSettings}
    />
  </ScreenWrapper>
);

export const BluetoothAccessDenied = {
  args: { isBusy: false },
  render: (args: {
    isBusy: boolean;
    onRetry: () => void;
    onContinue: () => void;
    onOpenSettings: () => void;
    onOpenBluetoothSettings: () => void;
  }) => renderConnectionErrorStory(ErrorCode.PermissionBluetoothDenied, args),
};

export const LocationAccessDenied = {
  args: { isBusy: false },
  render: (args: {
    isBusy: boolean;
    onRetry: () => void;
    onContinue: () => void;
    onOpenSettings: () => void;
    onOpenBluetoothSettings: () => void;
  }) => renderConnectionErrorStory(ErrorCode.PermissionLocationDenied, args),
};

export const NearbyDevicesAccessDenied = {
  args: { isBusy: false },
  render: (args: {
    isBusy: boolean;
    onRetry: () => void;
    onContinue: () => void;
    onOpenSettings: () => void;
    onOpenBluetoothSettings: () => void;
  }) =>
    renderConnectionErrorStory(ErrorCode.PermissionNearbyDevicesDenied, args),
};

export const BluetoothDisabled = {
  args: { isBusy: false },
  render: (args: {
    isBusy: boolean;
    onRetry: () => void;
    onContinue: () => void;
    onOpenSettings: () => void;
    onOpenBluetoothSettings: () => void;
  }) => renderConnectionErrorStory(ErrorCode.BluetoothDisabled, args),
};

export const BluetoothConnectionFailed = {
  args: { isBusy: false },
  render: (args: {
    isBusy: boolean;
    onRetry: () => void;
    onContinue: () => void;
    onOpenSettings: () => void;
    onOpenBluetoothSettings: () => void;
  }) => renderConnectionErrorStory(ErrorCode.BluetoothConnectionFailed, args),
};

// ── Ledger Errors ─────────────────────────────────────────────────────

const renderLedgerErrorStory = (
  Component: React.ComponentType<{
    isBusy?: boolean;
    onRetry: () => void;
    onContinue: () => void;
    onOpenSettings: () => void;
    onOpenBluetoothSettings: () => void;
    onExit: () => void;
  }>,
  args: {
    isBusy: boolean;
    onRetry: () => void;
    onContinue: () => void;
    onOpenSettings: () => void;
    onOpenBluetoothSettings: () => void;
    onExit: () => void;
  },
) => (
  <ScreenWrapper>
    <Component {...args} />
  </ScreenWrapper>
);

export const AppClosedError = {
  args: { isBusy: false },
  render: (args: {
    isBusy: boolean;
    onRetry: () => void;
    onContinue: () => void;
    onOpenSettings: () => void;
    onOpenBluetoothSettings: () => void;
    onExit: () => void;
  }) => renderLedgerErrorStory(LedgerAppClosedError, args),
};

export const BlindSigningDisabledError = {
  args: { isBusy: false },
  render: (args: {
    isBusy: boolean;
    onRetry: () => void;
    onContinue: () => void;
    onOpenSettings: () => void;
    onOpenBluetoothSettings: () => void;
    onExit: () => void;
  }) => renderLedgerErrorStory(LedgerBlindSigningDisabledError, args),
};

export const DeviceUnresponsiveError = {
  args: { isBusy: false },
  render: (args: {
    isBusy: boolean;
    onRetry: () => void;
    onContinue: () => void;
    onOpenSettings: () => void;
    onOpenBluetoothSettings: () => void;
    onExit: () => void;
  }) => renderLedgerErrorStory(LedgerDeviceUnresponsiveError, args),
};

export const GenericError = {
  args: { isBusy: false },
  render: (args: {
    isBusy: boolean;
    onRetry: () => void;
    onContinue: () => void;
    onOpenSettings: () => void;
    onOpenBluetoothSettings: () => void;
    onExit: () => void;
  }) => renderLedgerErrorStory(LedgerGenericError, args),
};

// ── ErrorState (base component) ───────────────────────────────────────

export const BaseErrorState = {
  args: {
    isBusy: false,
  },
  render: ({
    isBusy,
    onRetry,
    onContinue,
  }: {
    isBusy: boolean;
    onRetry: () => void;
    onContinue: () => void;
  }) => (
    <ScreenWrapper>
      <ErrorState
        testID="story-error-state"
        title="Something went wrong"
        description="An unexpected error occurred while connecting to your hardware wallet."
        isBusy={isBusy}
        illustration={<LedgerDeviceIllustration state="not-found" />}
        primaryAction={{
          label: 'Try again',
          onPress: onRetry,
          testID: 'story-error-retry',
          variant: ButtonVariant.Primary,
        }}
        secondaryAction={{
          label: 'Continue',
          onPress: onContinue,
          testID: 'story-error-continue',
          variant: ButtonVariant.Secondary,
        }}
      />
    </ScreenWrapper>
  ),
};
