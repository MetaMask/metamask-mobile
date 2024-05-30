import React from 'react';
import { View } from 'react-native';
import { Provider } from 'react-redux';
import { Hex } from '@metamask/utils';
import { Meta, StoryObj } from '@storybook/react-native';
import { configureStore } from '@reduxjs/toolkit';
import {
  SimulationData,
  SimulationErrorCode,
  SimulationTokenStandard,
} from '@metamask/transaction-controller';

import {
  default as SimulationDetails,
  type SimulationDetailsProps,
} from './SimulationDetails';

const backdropStyle = { backgroundColor: 'white', padding: 16 };
type Story = StoryObj<SimulationDetailsProps>;

const CHAIN_ID_MOCK = '0x1';
const FIRST_PARTY_CONTRACT_ADDRESS_1_MOCK =
  '0x0439e60F02a8900a951603950d8D4527f400C3f1';
const FIRST_PARTY_CONTRACT_ADDRESS_2_MOCK =
  '0x881D40237659C251811CEC9c364ef91dC08D300C';
const ERC20_TOKEN_1_MOCK = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'; // WBTC
const ERC20_TOKEN_2_MOCK = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'; // USDC
const ERC721_TOKEN_MOCK = '0x06012c8cf97bead5deae237070f9587f8e7a266d'; // CryptoKitties
const ERC1155_TOKEN_MOCK = '0x60e4d786628fea6478f785a6d7e704777c86a7c6'; // MAYC

const DUMMY_BALANCE_CHANGE = {
  previousBalance: '0xIGNORED' as Hex,
  newBalance: '0xIGNORED' as Hex,
};

const storeMock = configureStore({
  reducer: (state) => state,
  preloadedState: {
    settings: { useBlockieIcon: false },
    engine: {
      backgroundState: {
        PreferencesController: {
          useNativeCurrencyAsPrimaryCurrency: false,
          useTokenDetection: true,
        },
        NetworkController: {
          providerConfig: {
            chainId: CHAIN_ID_MOCK,
            ticker: 'ETH',
          },
        },
        NftController: {
          allNfts: {},
          allNftContracts: {},
        },
        TokenListController: {
          tokenList: {
            [ERC20_TOKEN_1_MOCK]: {
              address: ERC20_TOKEN_1_MOCK,
              symbol: 'WBTC',
              name: 'Wrapped Bitcoin',
              iconUrl: `https://static.metafi.codefi.network/api/v1/tokenIcons/1/${ERC20_TOKEN_1_MOCK}.png`,
            },
            [ERC20_TOKEN_2_MOCK]: {
              address: ERC20_TOKEN_2_MOCK,
              symbol: 'USDC',
              name: 'USD Coin',
              iconUrl: `https://static.metafi.codefi.network/api/v1/tokenIcons/1/${ERC20_TOKEN_2_MOCK}.png`,
            },
            [ERC721_TOKEN_MOCK]: {
              address: ERC721_TOKEN_MOCK,
              symbol: 'CK',
              name: 'CryptoKitties',
              iconUrl: `https://static.metafi.codefi.network/api/v1/tokenIcons/1/${ERC721_TOKEN_MOCK}.png`,
            },
            [ERC1155_TOKEN_MOCK]: {
              address: ERC1155_TOKEN_MOCK,
              symbol: 'MAYC',
              name: 'Mutant Ape Yacht Club',
              iconUrl: `https://static.metafi.codefi.network/api/v1/tokenIcons/1/${ERC1155_TOKEN_MOCK}.png `,
            },
          },
        },
        CurrencyRateController: {
          currentCurrency: 'usd',
          currencyRates: {
            ETH: {
              conversionRate: 10000,
            },
          },
        },
      },
    },
  },
});

const meta: Meta<typeof SimulationDetails> = {
  title: 'Components / UI / SimulationDetails',
  component: SimulationDetails,
  decorators: [
    (story) => (
      <Provider store={storeMock}>
        <View style={backdropStyle}>{story()}</View>
      </Provider>
    ),
  ],
};
export default meta;

export const Loading: Story = {
  args: {},
};

export const InvalidResponseError: Story = {
  args: {
    simulationData: {
      error: { code: SimulationErrorCode.InvalidResponse },
    } as SimulationData,
  },
};

export const RevertedTransaction: Story = {
  args: {
    simulationData: {
      error: { code: SimulationErrorCode.Reverted },
    } as SimulationData,
  },
};

export const NoBalanceChange: Story = {
  args: {
    simulationData: {
      tokenBalanceChanges: [],
    },
  },
};

export const TokenRecieveOnly: Story = {
  args: {
    simulationData: {
      tokenBalanceChanges: [
        {
          ...DUMMY_BALANCE_CHANGE,
          address: FIRST_PARTY_CONTRACT_ADDRESS_1_MOCK,
          difference: '0x123456',
          isDecrease: false,
          standard: SimulationTokenStandard.erc20,
        },
      ],
    },
  },
};

export const TokenSendOnly: Story = {
  args: {
    simulationData: {
      tokenBalanceChanges: [
        {
          ...DUMMY_BALANCE_CHANGE,
          address: FIRST_PARTY_CONTRACT_ADDRESS_1_MOCK,
          difference: '0x123456',
          isDecrease: true,
          standard: SimulationTokenStandard.erc20,
        },
      ],
    },
  },
};

export const MultipleTokens: Story = {
  args: {
    simulationData: {
      nativeBalanceChange: {
        ...DUMMY_BALANCE_CHANGE,
        difference: '0x12345678912322222',
        isDecrease: true,
      },
      tokenBalanceChanges: [
        {
          ...DUMMY_BALANCE_CHANGE,
          address: FIRST_PARTY_CONTRACT_ADDRESS_1_MOCK,
          difference: '0x123456',
          isDecrease: false,
          standard: SimulationTokenStandard.erc20,
        },
        {
          ...DUMMY_BALANCE_CHANGE,
          address: FIRST_PARTY_CONTRACT_ADDRESS_2_MOCK,
          difference: '0x123456901',
          isDecrease: false,
          standard: SimulationTokenStandard.erc20,
        },
      ],
    },
  },
};
