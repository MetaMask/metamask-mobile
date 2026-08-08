import { Hex } from '@metamask/utils';
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { fireLayoutEvent } from '../../../../../util/testUtils/react-native-svg-charts';
import { strings } from '../../../../../../locales/i18n';
import useEarningsHistory from '../../../Earn/hooks/useEarningsHistory';
import { MOCK_STAKED_ETH_MAINNET_ASSET } from '../../__mocks__/stakeMockData';
import StakeEarningsHistoryView, {
  STAKE_EARNINGS_HISTORY_VIEW_BACK_BUTTON_TEST_ID,
} from './StakeEarningsHistoryView';

jest.mock('../../../Earn/hooks/useEarningsHistory');

const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
  goBack: mockGoBack,
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
  const reactNativeSvgCharts = jest.requireActual('react-native-svg-charts');
  return {
    ...reactNativeSvgCharts,
    Grid: () => <></>,
  };
});

(useEarningsHistory as jest.Mock).mockReturnValue({
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the staking earnings history header title with the asset ticker', () => {
    const expectedTitle = strings('stake.earnings_history_title', {
      ticker:
        MOCK_STAKED_ETH_MAINNET_ASSET.ticker ||
        MOCK_STAKED_ETH_MAINNET_ASSET.symbol,
    });

    const renderedView = renderWithProvider(earningsHistoryView, {
      state: mockInitialState,
    });
    fireLayoutEvent(renderedView.root);

    expect(renderedView.getByText(expectedTitle)).toBeOnTheScreen();
  });

  it('calls navigation.goBack when the header back button is pressed', () => {
    const renderedView = renderWithProvider(earningsHistoryView, {
      state: mockInitialState,
    });
    fireLayoutEvent(renderedView.root);

    fireEvent.press(
      renderedView.getByTestId(STAKE_EARNINGS_HISTORY_VIEW_BACK_BUTTON_TEST_ID),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
