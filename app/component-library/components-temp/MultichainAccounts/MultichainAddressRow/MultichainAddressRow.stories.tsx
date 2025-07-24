/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { mockTheme } from '../../../../util/theme';
import { default as MultichainAddressRowComponent } from './MultichainAddressRow';
import { ProviderConfig } from '../../../../selectors/networkController';
import { SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS } from './MultichainAddressRow.constants';

const MultichainAddressRowMeta = {
  title: 'Component Library / MultichainAccounts',
  component: MultichainAddressRowComponent,
  argTypes: {
    networkName: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS.network.nickname,
    },
    address: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS.address,
    },
  },
};
export default MultichainAddressRowMeta;

export const MultichainAddressRow = {
  render: (args: { networkName: string; address: string }) => (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        backgroundColor: mockTheme.colors.background.default,
      }}
    >
      <MultichainAddressRowComponent
        network={{
          ...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS.network,
          nickname: args.networkName,
        }}
        address={args.address}
      />
    </View>
  ),
};

export const WithLongNetworkName = {
  render: (args: { address: string }) => (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        backgroundColor: mockTheme.colors.background.default,
      }}
    >
      <MultichainAddressRowComponent
        network={{
          ...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS.network,
          nickname: 'Very Long Network Name That Might Wrap',
        }}
        address={args.address}
      />
    </View>
  ),
};

export const WithCustomNetwork = {
  render: () => (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        backgroundColor: mockTheme.colors.background.default,
      }}
    >
      <MultichainAddressRowComponent
        network={
          {
            nickname: 'Polygon Mainnet',
            chainId: '0x89',
            ticker: 'MATIC',
            type: 'rpc',
            rpcPrefs: {},
          } as ProviderConfig
        }
        address="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
      />
    </View>
  ),
};
