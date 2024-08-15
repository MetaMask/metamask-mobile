import React from 'react';
import { View } from 'react-native';
import { cloneDeep } from 'lodash';
import { Provider } from 'react-redux';
import { Hex } from '@metamask/utils';
import { Meta, StoryObj } from '@storybook/react-native';
import { configureStore } from '@reduxjs/toolkit';
import {
  SimulationErrorCode,
  SimulationTokenStandard,
  CHAIN_IDS,
} from '@metamask/transaction-controller';

import {
  default as SimulationDetails,
  type SimulationDetailsProps,
} from './SimulationDetails';

const backdropStyle = { backgroundColor: 'white', padding: 16 };
type Story = StoryObj<SimulationDetailsProps>;

const DUMMY_BALANCE_CHANGE = {
  previousBalance: '0xIGNORED' as Hex,
  newBalance: '0xIGNORED' as Hex,
};

const CHAIN_ID_MOCK = '0x1';
const ERC20_TOKEN_1_MOCK = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'; // WBTC
const ERC20_TOKEN_2_MOCK = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'; // USDC
const ERC20_TOKEN_3_MOCK = '0xabcd6991c6218b36c1d19d4a2e9eb0ce36056789'; // UNKOWN
const ERC721_TOKEN_MOCK = '0x06012c8cf97bead5deae237070f9587f8e7a266d'; // CryptoKitties
const ERC1155_TOKEN_MOCK = '0x60e4d786628fea6478f785a6d7e704777c86a7c6'; // MAYC

const preloadedEngineState = {
  settings: { useBlockieIcon: false, showFiatInTestnets: true },
  engine: {
    backgroundState: {
      PreferencesController: {
        useNativeCurrencyAsPrimaryCurrency: false,
        useTokenDetection: true,
      },
      NetworkController: {
        providerConfig: {
          type: 'rpc',
          nickname: 'goerli',
          id: 'chain5',
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
          MATIC: {
            conversionRate: 1,
          },
        },
      },
      NamesController: {
        names: {
          ethereumAddress: {
            [ERC20_TOKEN_2_MOCK]: {
              [CHAIN_ID_MOCK]: {
                name: 'USDC with a saved name',
              },
            },
          },
        },
      },
    },
  },
};

const storeMock = configureStore({
  reducer: (state) => state,
  preloadedState: preloadedEngineState,
});

const preloadedPolygonState = cloneDeep(preloadedEngineState);
preloadedPolygonState.engine.backgroundState.NetworkController.providerConfig.chainId =
  CHAIN_IDS.POLYGON;
preloadedPolygonState.engine.backgroundState.NetworkController.providerConfig.ticker =
  'MATIC';

const storeMockPolygon = configureStore({
  reducer: (state) => state,
  preloadedState: preloadedPolygonState,
});

const preloadedArbitrumState = cloneDeep(preloadedEngineState);
preloadedArbitrumState.engine.backgroundState.NetworkController.providerConfig.chainId =
  CHAIN_IDS.ARBITRUM;
preloadedArbitrumState.engine.backgroundState.NetworkController.providerConfig.ticker =
  'ETH';
const storeMockArbitrum = configureStore({
  reducer: (state) => state,
  preloadedState: preloadedArbitrumState,
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

export const MultipleTokens: Story = {
  args: {
    simulationData: {
      nativeBalanceChange: {
        ...DUMMY_BALANCE_CHANGE,
        difference: '0x12345678912345678',
        isDecrease: true,
      },
      tokenBalanceChanges: [
        {
          ...DUMMY_BALANCE_CHANGE,
          address: ERC20_TOKEN_1_MOCK,
          difference: '0x1323232333232320',
          isDecrease: false,
          standard: SimulationTokenStandard.erc20,
        },
        {
          ...DUMMY_BALANCE_CHANGE,
          address: ERC20_TOKEN_2_MOCK,
          difference: '0x123456901',
          isDecrease: false,
          standard: SimulationTokenStandard.erc20,
        },
        {
          ...DUMMY_BALANCE_CHANGE,
          address: ERC721_TOKEN_MOCK,
          difference: '0x1',
          isDecrease: false,
          id: '0x721',
          standard: SimulationTokenStandard.erc721,
        },
        {
          ...DUMMY_BALANCE_CHANGE,
          address: ERC1155_TOKEN_MOCK,
          difference: '0x13',
          isDecrease: false,
          id: '0x1155',
          standard: SimulationTokenStandard.erc1155,
        },
        {
          ...DUMMY_BALANCE_CHANGE,
          address: ERC20_TOKEN_3_MOCK,
          difference: '0x123456901',
          isDecrease: false,
          standard: SimulationTokenStandard.erc20,
        },
      ],
    },
  },
};

export const SendSmallAmount: Story = {
  args: {
    simulationData: {
      nativeBalanceChange: {
        ...DUMMY_BALANCE_CHANGE,
        difference: '0x123',
        isDecrease: true,
      },
      tokenBalanceChanges: [],
    },
  },
};

export const LongValuesAndNames: Story = {
  args: {
    simulationData: {
      nativeBalanceChange: {
        ...DUMMY_BALANCE_CHANGE,
        difference: '0x12345678912345678',
        isDecrease: true,
      },
      tokenBalanceChanges: [
        {
          ...DUMMY_BALANCE_CHANGE,
          address: ERC20_TOKEN_1_MOCK,
          difference: '0x42345909',
          isDecrease: false,
          standard: SimulationTokenStandard.erc20,
        },
        {
          ...DUMMY_BALANCE_CHANGE,
          address: ERC20_TOKEN_2_MOCK,
          difference: '0x123456901',
          isDecrease: false,
          standard: SimulationTokenStandard.erc20,
        },
      ],
    },
  },
};

export const PolygonNativeAsset: Story = {
  args: {
    simulationData: {
      nativeBalanceChange: {
        ...DUMMY_BALANCE_CHANGE,
        difference: '0x9345678923456789',
        isDecrease: true,
      },
      tokenBalanceChanges: [],
    },
  },
  decorators: [
    (story) => <Provider store={storeMockPolygon}>{story()}</Provider>,
  ],
};

export const ArbitrumNativeAsset: Story = {
  args: {
    simulationData: {
      nativeBalanceChange: {
        ...DUMMY_BALANCE_CHANGE,
        difference: '0x9345678923456789',
        isDecrease: true,
      },
      tokenBalanceChanges: [],
    },
  },
  decorators: [
    (story) => <Provider store={storeMockArbitrum}>{story()}</Provider>,
  ],
};

export const ReceiveOnly: Story = {
  args: {
    simulationData: {
      nativeBalanceChange: {
        previousBalance: '0x2',
        newBalance: '0x1',
        difference: '0x12345678912345678',
        isDecrease: false,
      },
      tokenBalanceChanges: [],
    },
  },
};

export const SendOnly: Story = {
  args: {
    simulationData: {
      nativeBalanceChange: {
        previousBalance: '0x1',
        newBalance: '0x2',
        difference: '0x12345678912345678',
        isDecrease: true,
      },
      tokenBalanceChanges: [],
    },
  },
};

export const NoBalanceChanges: Story = {
  args: {
    simulationData: {
      nativeBalanceChange: undefined,
      tokenBalanceChanges: [],
    },
  },
};

export const Loading: Story = {
  args: {
    simulationData: undefined,
  },
};

export const TransactionReverted: Story = {
  args: {
    simulationData: {
      error: { code: SimulationErrorCode.Reverted },
      nativeBalanceChange: undefined,
      tokenBalanceChanges: [],
    },
  },
};

export const GenericError: Story = {
  args: {
    simulationData: {
      error: {},
      nativeBalanceChange: undefined,
      tokenBalanceChanges: [],
    },
  },
};
