import React from 'react';
import { View } from 'react-native';
import { Provider } from 'react-redux';
import { Meta, StoryObj } from '@storybook/react-native';
import { configureStore } from '@reduxjs/toolkit';
import { default as NameComponent } from './Name';
import { NameProperties, NameType } from './Name.types';
import { mockNetworkState } from '../../../util/test/network';
import { CHAIN_IDS } from '@metamask/transaction-controller';

const backdropStyle = { backgroundColor: 'white', padding: 50 };
const UNKNOWN_ADDRESS = '0x2990079bcdEe240329a520d2444386FC119da21a';
const METAMASK_MAINNET_BRIDGE_ADDRESS =
  '0x0439e60F02a8900a951603950d8D4527f400C3f1';
const NFT_ADDRESS = '0x12345643338A158DeC2FbF411B71aeB188743';
const SELECTED_ACCOUNT = '0x72b1FDb6443338A158DeC2FbF411B71aeB157A42';
const VARIATION_MOCK = CHAIN_IDS.MAINNET;

type Story = StoryObj<NameProperties>;

const storeMock = configureStore({
  reducer: (state) => state,
  preloadedState: {
    settings: { useBlockieIcon: false },
    engine: {
      backgroundState: {
        NetworkController: {
          ...mockNetworkState({
            chainId: VARIATION_MOCK,
            id: 'sepolia',
            nickname: 'Sepolia',
            ticker: 'ETH',
          }),
        },
        PreferencesController: {
          selectedAddress: SELECTED_ACCOUNT,
        },
        NftController: {
          allNfts: {},
          allNftContracts: {
            [SELECTED_ACCOUNT]: {
              [VARIATION_MOCK]: [
                {
                  address: NFT_ADDRESS,
                  name: 'MyToken',
                  symbol: 'MTK',
                },
              ],
            },
          },
        },
      },
    },
  },
});

const meta: Meta<typeof NameComponent> = {
  title: 'Components / UI / Name',
  component: NameComponent,
  decorators: [
    (story) => (
      <Provider store={storeMock}>
        <View style={backdropStyle}>{story()}</View>
      </Provider>
    ),
  ],
};
export default meta;

export const UnknownAddress: Story = {
  args: {
    type: NameType.EthereumAddress,
    value: UNKNOWN_ADDRESS,
    variation: VARIATION_MOCK,
  },
};

export const RecognizedFirstPartyContract: Story = {
  args: {
    type: NameType.EthereumAddress,
    value: METAMASK_MAINNET_BRIDGE_ADDRESS,
    variation: VARIATION_MOCK,
  },
};

export const RecognizedNFT: Story = {
  args: {
    type: NameType.EthereumAddress,
    value: NFT_ADDRESS,
    variation: VARIATION_MOCK,
  },
};

export const NarrowWidth: Story = {
  render() {
    return (
      <View style={backdropStyle}>
        <NameComponent
          type={NameType.EthereumAddress}
          value={UNKNOWN_ADDRESS}
          variation={VARIATION_MOCK}
        />
      </View>
    );
  },
};
