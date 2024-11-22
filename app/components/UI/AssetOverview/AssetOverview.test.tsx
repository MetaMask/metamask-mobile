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
import { getDecimalChainId } from '../../../util/networks';
import { TokenOverviewSelectorsIDs } from '../../../../e2e/selectors/TokenOverview.selectors';

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
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
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

// Mock the navigation object.
const navigation = {
  navigate: jest.fn(),
};
const asset = {
  balance: '400',
  balanceFiat: '1500',
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
  it('should render correctly', async () => {
    const container = renderWithProvider(
      <AssetOverview
        asset={asset}
        navigation={navigation}
        displayBuyButton
        displaySwapsButton
      />,
      { state: mockInitialState },
    );
    expect(container).toMatchSnapshot();
  });

  it('should handle buy button press', async () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        navigation={navigation}
        displayBuyButton
        displaySwapsButton
      />,
      { state: mockInitialState },
    );

    const buyButton = getByTestId(TokenOverviewSelectorsIDs.BUY_BUTTON);
    fireEvent.press(buyButton);

    expect(navigation.navigate).toHaveBeenCalledWith(
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
        navigation={navigation}
        displayBuyButton
        displaySwapsButton
      />,
      { state: mockInitialState },
    );

    const sendButton = getByTestId('token-send-button');
    fireEvent.press(sendButton);

    expect(navigation.navigate).toHaveBeenCalledWith('SendFlowView', {});
  });

  it('should handle swap button press', async () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        navigation={navigation}
        displayBuyButton
        displaySwapsButton
      />,
      { state: mockInitialState },
    );

    const swapButton = getByTestId('token-swap-button');
    fireEvent.press(swapButton);

    expect(navigation.navigate).toHaveBeenCalledWith('Swaps', {
      params: {
        sourcePage: 'MainView',
        sourceToken: asset.address,
      },
      screen: 'SwapsAmountView',
    });
  });

  it('should not render swap button if displaySwapsButton is false', async () => {
    const { queryByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        navigation={navigation}
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
        navigation={navigation}
        displayBuyButton={false}
        displaySwapsButton
      />,
      { state: mockInitialState },
    );

    const buyButton = queryByTestId(TokenOverviewSelectorsIDs.BUY_BUTTON);
    expect(buyButton).toBeNull();
  });
});
