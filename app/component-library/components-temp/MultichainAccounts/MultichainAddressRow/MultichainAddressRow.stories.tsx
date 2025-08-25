/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { CaipChainId } from '@metamask/utils';
import { mockTheme } from '../../../../util/theme';
import { default as MultichainAddressRowComponent } from './MultichainAddressRow';
import { SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS } from './MultichainAddressRow.constants';

const MultichainAddressRowMeta = {
  title: 'Component Library / MultichainAccounts',
  component: MultichainAddressRowComponent,
  argTypes: {
    chainId: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS.chainId,
    },
    networkName: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS.networkName,
    },
    address: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS.address,
    },
  },
};
export default MultichainAddressRowMeta;

export const MultichainAddressRow = {
  render: (args: {
    chainId: CaipChainId;
    networkName: string;
    address: string;
  }) => (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        backgroundColor: mockTheme.colors.background.default,
      }}
    >
      <MultichainAddressRowComponent
        chainId={args.chainId}
        networkName={args.networkName}
        address={args.address}
      />
    </View>
  ),
};

export const WithLongNetworkName = {
  render: (args: { chainId: CaipChainId; address: string }) => (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        backgroundColor: mockTheme.colors.background.default,
      }}
    >
      <MultichainAddressRowComponent
        chainId={args.chainId || '0x1'}
        networkName="Very Long Network Name That Might Wrap"
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
        chainId="eip155:137"
        networkName="Polygon Mainnet"
        address="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
      />
    </View>
  ),
};
