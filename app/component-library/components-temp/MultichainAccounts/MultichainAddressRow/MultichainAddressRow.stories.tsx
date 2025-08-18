/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { CaipChainId } from '@metamask/utils';
import { mockTheme } from '../../../../util/theme';
import { IconName } from '../../../components/Icons/Icon';
import { default as MultichainAddressRowComponent } from './MultichainAddressRow';
import {
  SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS,
  MULTICHAIN_ADDRESS_ROW_COPY_BUTTON_TEST_ID,
  MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID,
} from './MultichainAddressRow.constants';

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

const icons = [
  {
    name: IconName.Copy,
    callback: () => {
      // Do nothing
    },
    testId: MULTICHAIN_ADDRESS_ROW_COPY_BUTTON_TEST_ID,
  },
  {
    name: IconName.QrCode,
    callback: () => {
      // Do nothing
    },
    testId: MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID,
  },
];

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
        icons={icons}
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
        icons={icons}
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
        icons={icons}
      />
    </View>
  ),
};
