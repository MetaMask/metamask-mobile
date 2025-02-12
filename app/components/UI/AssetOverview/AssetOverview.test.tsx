import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { zeroAddress } from 'ethereumjs-util';
import { NetworkController } from '@metamask/network-controller';
import AssetOverview from './AssetOverview';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_2,
} from '../../../util/test/accountsControllerTestUtils';
import { createBuyNavigationDetails } from '../Ramp/routes/utils';
import {
  getDecimalChainId,
  isPortfolioViewEnabled,
} from '../../../util/networks';
import { TokenOverviewSelectorsIDs } from '../../../../e2e/selectors/wallet/TokenOverview.selectors';
// eslint-disable-next-line import/no-namespace
import * as networks from '../../../util/networks';
// eslint-disable-next-line import/no-namespace
import * as transactions from '../../../util/transactions';
import { mockNetworkState } from '../../../util/test/network';

const MOCK_CHAIN_ID = '0x1';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        selectedAddress: MOCK_ADDRESS_2,
      },
      TokenRatesController: {
        marketData: {
          '0x1': {
            [zeroAddress()]: { price: 0.005 },
          },
        },
      },
      NetworkController: {
        providerConfig: {
          chainId: MOCK_CHAIN_ID,
        },
      } as unknown as NetworkController['state'],
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      AccountTrackerController: {
        accountsByChainId: {
          [MOCK_CHAIN_ID]: {
            [MOCK_ADDRESS_2]: { balance: '0x1' },
          },
        },
      } as const,
    },
    CurrencyRateController: {
      conversionRate: {
        ETH: {
          conversionDate: 1732572535.47,
          conversionRate: 3432.53,
          usdConversionRate: 3432.53,
        },
      },
    },
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};

const mockNavigate = jest.fn();
const navigate = mockNavigate;
const mockNetworkConfiguration = {
  rpcEndpoints: [
    {
      networkClientId: 'mockNetworkClientId',
    },
  ],
  defaultRpcEndpointIndex: 0,
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {},
    theme: {
      colors: {
        icon: {},
      },
    },
  }),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkConfigurationByChainId: jest
        .fn()
        .mockReturnValue(mockNetworkConfiguration),
      setActiveNetwork: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

const asset = {
  balance: '400',
  balanceFiat: '1500',
  chainId: MOCK_CHAIN_ID,
  logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg',
  symbol: 'ETH',
  name: 'Ethereum',
  isETH: undefined,
  hasBalanceError: false,
  decimals: 18,
  address: '0x123',
  aggregators: [],
  image: '',
};

describe('AssetOverview', () => {
  beforeEach(() => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(false);
  });

  it('should render correctly', async () => {
    const container = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayBuyButton
        displaySwapsButton
        swapsIsLive
      />,
      { state: mockInitialState },
    );
    expect(container).toMatchSnapshot();
  });

  it('should render correctly when portfolio view is enabled', async () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);

    const container = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayBuyButton
        displaySwapsButton
        swapsIsLive
      />,
      { state: mockInitialState },
    );
    expect(container).toMatchSnapshot();
  });

  it('should handle buy button press', async () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayBuyButton
        displaySwapsButton
        swapsIsLive
      />,
      { state: mockInitialState },
    );

    const buyButton = getByTestId(TokenOverviewSelectorsIDs.BUY_BUTTON);
    fireEvent.press(buyButton);

    expect(navigate).toHaveBeenCalledWith(
      ...createBuyNavigationDetails({
        address: asset.address,
        chainId: getDecimalChainId(MOCK_CHAIN_ID),
      }),
    );
  });

  it('should handle send button press', async () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayBuyButton
        displaySwapsButton
        swapsIsLive
      />,
      { state: mockInitialState },
    );

    const sendButton = getByTestId('token-send-button');
    fireEvent.press(sendButton);

    expect(navigate).toHaveBeenCalledWith('SendFlowView', {});
  });

  it('should handle send button press for native asset when isETH is false', async () => {
    const spyOnGetEther = jest.spyOn(transactions, 'getEther');

    const nativeAsset = {
      balance: '400',
      balanceFiat: '1500',
      chainId: '0x38',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg',
      symbol: 'BNB',
      name: 'Binance smart chain',
      isETH: false,
      nativeCurrency: 'BNB',
      hasBalanceError: false,
      decimals: 18,
      address: '0x123',
      aggregators: [],
      image: '',
      isNative: true,
    };

    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={nativeAsset}
        displayBuyButton
        displaySwapsButton
        swapsIsLive
      />,
      {
        state: {
          ...mockInitialState,
          engine: {
            ...mockInitialState.engine,
            backgroundState: {
              ...mockInitialState.engine.backgroundState,
              NetworkController: {
                ...mockNetworkState({
                  chainId: '0x38',
                  id: 'bsc',
                  nickname: 'Binance Smart Chain',
                  ticker: 'BNB',
                  blockExplorerUrl: 'https://bscscan.com',
                }),
              },
              TokenRatesController: {
                marketData: {
                  '0x38': {
                    [zeroAddress()]: { price: 0.005 },
                  },
                },
              },
              AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
              AccountTrackerController: {
                accountsByChainId: {
                  '0x38': {
                    [nativeAsset.address]: { balance: '0x1' },
                  },
                },
              } as const,
            },
          },
        },
      },
    );

    const sendButton = getByTestId('token-send-button');
    fireEvent.press(sendButton);
    expect(navigate).toHaveBeenCalledWith('SendFlowView', {});
    expect(spyOnGetEther).toHaveBeenCalledWith('BNB');
  });

  it('should handle swap button press', async () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayBuyButton
        displaySwapsButton
        swapsIsLive
      />,
      { state: mockInitialState },
    );

    const swapButton = getByTestId('token-swap-button');
    fireEvent.press(swapButton);

    if (isPortfolioViewEnabled()) {
      expect(navigate).toHaveBeenCalledTimes(3);
      expect(navigate).toHaveBeenNthCalledWith(1, 'RampBuy', {
        screen: 'GetStarted',
        params: {
          address: asset.address,
          chainId: getDecimalChainId(MOCK_CHAIN_ID),
        },
      });
      expect(navigate).toHaveBeenNthCalledWith(2, 'SendFlowView', {});
      expect(navigate).toHaveBeenNthCalledWith(3, 'Swaps', {
        screen: 'SwapsAmountView',
        params: {
          sourcePage: 'MainView',
          address: asset.address,
          chainId: MOCK_CHAIN_ID,
        },
      });
    } else {
      expect(navigate).toHaveBeenCalledWith('Swaps', {
        screen: 'SwapsAmountView',
        params: {
          sourcePage: 'MainView',
          sourceToken: asset.address,
          chainId: '0x1',
        },
      });
    }
  });

  it('should not render swap button if displaySwapsButton is false', async () => {
    const { queryByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayBuyButton
        displaySwapsButton={false}
      />,
      { state: mockInitialState },
    );

    const swapButton = queryByTestId('token-swap-button');
    expect(swapButton).toBeNull();
  });

  it('should not render buy button if displayBuyButton is false', async () => {
    const { queryByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayBuyButton={false}
        displaySwapsButton
        swapsIsLive
      />,
      { state: mockInitialState },
    );

    const buyButton = queryByTestId(TokenOverviewSelectorsIDs.BUY_BUTTON);
    expect(buyButton).toBeNull();
  });
});
