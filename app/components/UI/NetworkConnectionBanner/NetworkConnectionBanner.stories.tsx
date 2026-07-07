import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import Button, {
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import type { NetworkConnectionBannerState } from '../../../reducers/networkConnectionBanner';
import {
  NetworkConnectionBannerView,
  type NetworkConnectionBannerViewProps,
} from './NetworkConnectionBanner';
import type { NetworkConnectionBannerStatus } from './types';

type VisibleNetworkConnectionBannerState = Exclude<
  NetworkConnectionBannerState,
  { visible: false }
>;

interface NetworkConnectionBannerTrigger {
  label: string;
  state: VisibleNetworkConnectionBannerState;
}

const MOCK_POLYGON_STATE = {
  chainId: '0x89' as const,
  networkName: 'Polygon Mainnet',
  rpcUrl: 'https://polygon-rpc.com',
};

const MOCK_ETHEREUM_STATE = {
  chainId: '0x1' as const,
  networkName: 'Ethereum Mainnet',
  rpcUrl: 'https://mainnet.infura.io/v3/test',
};

const buildVisibleState = (
  status: NetworkConnectionBannerStatus,
  overrides: Partial<VisibleNetworkConnectionBannerState> = {},
): VisibleNetworkConnectionBannerState => ({
  visible: true,
  status,
  isInfuraEndpoint: false,
  ...MOCK_POLYGON_STATE,
  ...overrides,
});

const NETWORK_CONNECTION_BANNER_TRIGGERS: NetworkConnectionBannerTrigger[] = [
  {
    label: 'Degraded — custom RPC (update)',
    state: buildVisibleState('degraded'),
  },
  {
    label: 'Degraded — custom RPC (switch to Infura)',
    state: buildVisibleState('degraded', {
      infuraNetworkClientId: 'infura-mainnet',
    }),
  },
  {
    label: 'Degraded — Infura endpoint',
    state: buildVisibleState('degraded', {
      ...MOCK_ETHEREUM_STATE,
      isInfuraEndpoint: true,
    }),
  },
  {
    label: 'Unavailable — Infura endpoint',
    state: buildVisibleState('unavailable', {
      ...MOCK_ETHEREUM_STATE,
      isInfuraEndpoint: true,
    }),
  },
  {
    label: 'Unavailable — custom RPC (update)',
    state: buildVisibleState('unavailable'),
  },
  {
    label: 'Unavailable — custom RPC (switch to Infura)',
    state: buildVisibleState('unavailable', {
      infuraNetworkClientId: 'infura-mainnet',
    }),
  },
  {
    label: 'Unavailable — long network name',
    state: buildVisibleState('unavailable', {
      networkName: 'Monad Mainnet YOYOMI JOK.OK.OK.OK.OK.OK.OK.OK',
    }),
  },
];

const StoryContainer = ({ children }: { children: React.ReactNode }) => {
  const tw = useTailwind();

  return (
    <View style={tw.style('relative min-h-full w-full flex-1 bg-default p-4')}>
      {children}
    </View>
  );
};

const NetworkConnectionBannerStoryContent = () => {
  const tw = useTailwind();
  const [activeState, setActiveState] =
    useState<VisibleNetworkConnectionBannerState | null>(null);

  const showStoryAlert = useCallback((message: string) => {
    Alert.alert('Storybook', message);
  }, []);

  const bannerProps: NetworkConnectionBannerViewProps | null = activeState
    ? {
        networkConnectionBannerState: activeState,
        onUpdateRpc: () => showStoryAlert('Update RPC pressed'),
        onSwitchToInfura: () => {
          showStoryAlert('Switch to MetaMask default RPC pressed');
        },
      }
    : null;

  return (
    <StoryContainer>
      <ScrollView
        contentContainerStyle={tw.style('gap-6 pb-32')}
        keyboardShouldPersistTaps="handled"
      >
        <View style={tw.style('gap-2')}>
          <Text variant={TextVariant.HeadingSm}>Network connection banner</Text>
          {NETWORK_CONNECTION_BANNER_TRIGGERS.map((trigger) => (
            <Button
              key={trigger.label}
              variant={ButtonVariants.Secondary}
              label={trigger.label}
              onPress={() => setActiveState(trigger.state)}
            />
          ))}
          <Button
            variant={ButtonVariants.Secondary}
            label="Hide banner"
            onPress={() => setActiveState(null)}
          />
        </View>
        {bannerProps ? (
          <View style={tw.style('mt-4')}>
            <NetworkConnectionBannerView {...bannerProps} />
          </View>
        ) : null}
      </ScrollView>
    </StoryContainer>
  );
};

const NetworkConnectionBannerMeta = {
  title: 'Components / UI / NetworkConnectionBanner',
  component: NetworkConnectionBannerView,
};

export default NetworkConnectionBannerMeta;

export const Default = {
  render: () => <NetworkConnectionBannerStoryContent />,
};
