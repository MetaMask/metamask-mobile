import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { IconName } from '@metamask/design-system-react-native';
import DiscoveryFoundScreen from './screens/DiscoveryFound';
import DiscoverySelectDeviceScreen from './screens/DiscoverySelectDevice';
import DiscoveryNotFoundScreen from './screens/DiscoveryNotFound';
import DiscoveryAccountSelectionScreen from './screens/DiscoveryAccountSelection';
import type { DeviceUIConfig } from './DiscoveryFlow.types';
import type { DiscoveredDevice } from '../../../../core/HardwareWallet/types';

// ---------------------------------------------------------------------------
// Shared mock data factories
// ---------------------------------------------------------------------------

const createMockDevice = (
  overrides: Partial<DiscoveredDevice> = {},
): DiscoveredDevice => ({
  id: 'ledger-nano-x-abc123',
  name: 'Ledger Nano X ABC1',
  ...overrides,
});

const createMockDevices = (): DiscoveredDevice[] => [
  createMockDevice(),
  createMockDevice({ id: 'ledger-nano-x-def456', name: 'Ledger Nano X DEF4' }),
  createMockDevice({ id: 'ledger-flex-ghi789', name: 'Ledger Flex GHI7' }),
];

const createMockConfig = (
  overrides: Partial<DeviceUIConfig> = {},
): DeviceUIConfig => ({
  walletType: HardwareWalletType.Ledger,
  discoveryTimeoutMs: 15000,
  animationSource: 0,
  artboardName: 'Ledger',
  stateMachineName: 'Ledger_states',
  deviceIcon: IconName.Mobile,
  troubleshootingItems: [
    {
      id: 'lock',
      icon: IconName.LockSlash,
      label: 'Unlock your Ledger device',
    },
    {
      id: 'ethereum',
      icon: IconName.Ethereum,
      label: 'Install and open the Ethereum app',
    },
  ],
  errorToStepMap: {},
  accountManager: {
    getAccounts: async () => [],
    unlockAccounts: async () => undefined,
    forgetDevice: async () => undefined,
  },
  strings: {
    deviceFound: 'Device found!',
    connectButton: 'Connect',
    deviceNotFound: 'Device not found',
    tryAgain: 'Try again',
    selectAccounts: 'Select accounts to import',
  },
  ...overrides,
});

const noop = () => undefined;

// ---------------------------------------------------------------------------
// Storybook meta
// ---------------------------------------------------------------------------

export default {
  title: 'Views / Connect Hardware / Discovery Flow',
};

// ---------------------------------------------------------------------------
// DiscoveryFoundScreen stories
// ---------------------------------------------------------------------------

export const DiscoveryFoundDefault = {
  title: 'Views / Connect Hardware / Discovery Flow / DiscoveryFoundScreen',
  render: () => (
    <DiscoveryFoundScreen
      config={createMockConfig()}
      deviceName="Ledger Nano X ABC1"
      onOpenSelectDevice={noop}
      onConnect={noop}
    />
  ),
};

export const DiscoveryFoundConnecting = {
  title:
    'Views / Connect Hardware / Discovery Flow / DiscoveryFoundScreen / Connecting',
  render: () => (
    <DiscoveryFoundScreen
      config={createMockConfig()}
      deviceName="Ledger Nano X ABC1"
      isConnecting
      onOpenSelectDevice={noop}
      onConnect={noop}
    />
  ),
};

// ---------------------------------------------------------------------------
// DiscoverySelectDeviceScreen stories
// ---------------------------------------------------------------------------

export const DiscoverySelectDeviceDefault = {
  title:
    'Views / Connect Hardware / Discovery Flow / DiscoverySelectDeviceScreen',
  render: () => {
    const devices = createMockDevices();
    const [selectedId, setSelectedId] = React.useState(devices[0].id);
    return (
      <DiscoverySelectDeviceScreen
        devices={devices}
        selectedDeviceId={selectedId}
        onSelectDevice={(d) => setSelectedId(d.id)}
        onClose={noop}
        onSave={noop}
        config={createMockConfig()}
      />
    );
  },
};

export const DiscoverySelectDeviceSingleDevice = {
  title:
    'Views / Connect Hardware / Discovery Flow / DiscoverySelectDeviceScreen / Single Device',
  render: () => {
    const devices = [createMockDevice()];
    return (
      <DiscoverySelectDeviceScreen
        devices={devices}
        selectedDeviceId={devices[0].id}
        onSelectDevice={noop}
        onClose={noop}
        onSave={noop}
        config={createMockConfig()}
      />
    );
  },
};

// ---------------------------------------------------------------------------
// DiscoveryNotFoundScreen stories
// ---------------------------------------------------------------------------

export const DiscoveryNotFoundDefault = {
  title: 'Views / Connect Hardware / Discovery Flow / DiscoveryNotFoundScreen',
  render: () => (
    <DiscoveryNotFoundScreen
      config={createMockConfig()}
      onRetry={noop}
      onBack={noop}
    />
  ),
};

export const DiscoveryNotFoundNoBack = {
  title:
    'Views / Connect Hardware / Discovery Flow / DiscoveryNotFoundScreen / No Back',
  render: () => (
    <DiscoveryNotFoundScreen config={createMockConfig()} onRetry={noop} />
  ),
};

// ---------------------------------------------------------------------------
// DiscoveryAccountSelectionScreen story
// ---------------------------------------------------------------------------

const accountSelectionMockStore = configureStore({
  reducer: {
    engine: () => ({
      backgroundState: {
        CurrencyRateController: {
          currentCurrency: 'usd',
          currencyRates: {},
        },
      },
    }),
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }),
});

export const DiscoveryAccountSelectionDefault = {
  title:
    'Views / Connect Hardware / Discovery Flow / DiscoveryAccountSelectionScreen',
  render: () => (
    <Provider store={accountSelectionMockStore}>
      <DiscoveryAccountSelectionScreen
        config={createMockConfig()}
        onBack={noop}
        selectedDevice={createMockDevice()}
      />
    </Provider>
  ),
};
