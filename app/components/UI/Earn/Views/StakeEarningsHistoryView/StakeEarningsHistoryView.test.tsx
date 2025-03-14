import React from 'react';
import StakeEarningsHistoryView from './StakeEarningsHistoryView';
import useStakingEarningsHistory from '../../hooks/useStakingEarningsHistory';
import { MOCK_STAKED_ETH_MAINNET_ASSET } from '../../__mocks__/mockData';
import { fireLayoutEvent } from '../../../../../util/testUtils/react-native-svg-charts';
import { getStakingNavbar } from '../../../Navbar';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { Hex } from '@metamask/utils';

jest.mock('../../../Navbar');
jest.mock('../../hooks/useStakingEarningsHistory');

const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
    useRoute: () => ({
      key: '1',
      name: 'params',
      params: { asset: MOCK_STAKED_ETH_MAINNET_ASSET },
    }),
  };
});
jest.mock('react-native-svg-charts', () => {
  const reactNativeSvgCharts = jest.requireActual('react-native-svg-charts'); // Get the actual Grid component
  return {
    ...reactNativeSvgCharts,
    Grid: () => <></>,
  };
});

(useStakingEarningsHistory as jest.Mock).mockReturnValue({
  earningsHistory: [
    {
      dateStr: '2023-01-01',
      dailyRewards: '1000000000000000000',
      sumRewards: '1000000000000000000',
    },
    {
      dateStr: '2023-01-02',
      dailyRewards: '1000000000000000000',
      sumRewards: '2000000000000000000',
    },
  ],
  isLoading: false,
  error: null,
});

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {
          ETH: {
            conversionRate: 3363.79,
          },
        },
      },
      NetworkController: {
        selectedNetworkClientId: 'selectedNetworkClientId',
        networkConfigurationsByChainId: {
          '0x1': {
            nativeCurrency: 'ETH',
            chainId: '0x1' as Hex,
            rpcEndpoints: [
              {
                networkClientId: 'selectedNetworkClientId',
              },
            ],
            defaultRpcEndpointIndex: 0,
          },
        },
      },
    },
  },
};

const earningsHistoryView = <StakeEarningsHistoryView />;

describe('StakeEarningsHistoryView', () => {
  it('renders correctly and matches snapshot', () => {
    const renderedView = renderWithProvider(earningsHistoryView, {
      state: mockInitialState,
    });
    fireLayoutEvent(renderedView.root);
    expect(renderedView.toJSON()).toMatchSnapshot();
  });

  it('calls navigation setOptions to get staking navigation bar', () => {
    const renderedView = renderWithProvider(earningsHistoryView, {
      state: mockInitialState,
    });
    fireLayoutEvent(renderedView.root);
    expect(mockNavigation.setOptions).toHaveBeenCalled();
    expect(getStakingNavbar).toHaveBeenCalled();
  });
});
