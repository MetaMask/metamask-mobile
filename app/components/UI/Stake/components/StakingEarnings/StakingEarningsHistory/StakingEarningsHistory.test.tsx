import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import StakingEarningsHistory from './StakingEarningsHistory';
import useStakingEarningsHistory from '../../../hooks/useStakingEarningsHistory';
import { MOCK_STAKED_ETH_MAINNET_ASSET } from '../../../__mocks__/mockData';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { Hex } from '@metamask/smart-transactions-controller/dist/types';
import { TokenI } from '../../../../Tokens/types';

jest.mock('../../../hooks/useStakingEarningsHistory');
jest.mock('react-native-svg-charts', () => {
  const reactNativeSvgCharts = jest.requireActual('react-native-svg-charts');
  return {
    ...reactNativeSvgCharts,
    Grid: () => <></>,
  };
});

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {
          ETH: {
            conversionRate: 3363.79,
          },
        },
      },
      TokenRatesController: {
        marketData: {
          '0x1': {
            '0xUSDC000000000000000000000000000000000000': {
              price: 0.0002990514020561363,
            },
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

describe('StakingEarningsHistory', () => {
  beforeEach(() => {
    (useStakingEarningsHistory as jest.Mock).mockReturnValue({
      earningsHistory: [
        {
          dateStr: '2022-12-31',
          dailyRewards: '442219562575615',
          sumRewards: '442219562575615',
        },
        {
          dateStr: '2023-01-01',
          dailyRewards: '542219562575615',
          sumRewards: '984439125151230',
        },
      ],
      isLoading: false,
      error: null,
    });
  });

  it('renders correctly with earnings history', () => {
    const { getByText } = renderWithProvider(
      <StakingEarningsHistory
        asset={{ ...MOCK_STAKED_ETH_MAINNET_ASSET, ticker: 'ETH' }}
      />,
      {
        state: mockInitialState,
      },
    );

    expect(getByText('7D')).toBeTruthy();
    expect(getByText('M')).toBeTruthy();
    expect(getByText('Y')).toBeTruthy();
    expect(getByText('Lifetime earnings')).toBeTruthy();
    expect(getByText('0.00098 ETH')).toBeTruthy();
    expect(getByText('December')).toBeTruthy();
    expect(getByText('$1.49')).toBeTruthy();
    expect(getByText('+ 0.00044 ETH')).toBeTruthy();
    expect(getByText('January')).toBeTruthy();
    expect(getByText('$1.82')).toBeTruthy();
    expect(getByText('+ 0.00054 ETH')).toBeTruthy();
  });

  it('renders correctly with trailing zero values', () => {
    (useStakingEarningsHistory as jest.Mock).mockReturnValue({
      earningsHistory: [
        {
          dateStr: '2022-11-02',
          dailyRewards: '0',
          sumRewards: '0',
        },
        {
          dateStr: '2022-12-31',
          dailyRewards: '442219562575615',
          sumRewards: '442219562575615',
        },
        {
          dateStr: '2023-01-01',
          dailyRewards: '542219562575615',
          sumRewards: '984439125151230',
        },
      ],
      isLoading: false,
      error: null,
    });

    const { getByText, queryByText } = renderWithProvider(
      <StakingEarningsHistory asset={MOCK_STAKED_ETH_MAINNET_ASSET} />,
      {
        state: mockInitialState,
      },
    );

    expect(getByText('Lifetime earnings')).toBeTruthy();
    expect(getByText('0.00098 ETH')).toBeTruthy();
    expect(getByText('December')).toBeTruthy();
    expect(getByText('$1.49')).toBeTruthy();
    expect(getByText('+ 0.00044 ETH')).toBeTruthy();
    expect(getByText('January')).toBeTruthy();
    expect(getByText('$1.82')).toBeTruthy();
    expect(getByText('+ 0.00054 ETH')).toBeTruthy();
    expect(queryByText('November')).toBeFalsy();
  });

  it('should render correctly with an erc20 token asset', () => {
    (useStakingEarningsHistory as jest.Mock).mockReturnValue({
      earningsHistory: [
        {
          dateStr: '2022-12-31',
          dailyRewards: '100000000',
          sumRewards: '100000000',
        },
        {
          dateStr: '2023-01-01',
          dailyRewards: '300000000',
          sumRewards: '400000000',
        },
      ],
      isLoading: false,
      error: null,
    });

    const erc20Asset = {
      address: '0xUSDC000000000000000000000000000000000000',
      chainId: '0x1',
      name: 'USD Coin',
      symbol: 'USD Coin',
      ticker: 'USDC',
      isETH: false,
      decimals: 6,
    } as TokenI;

    const { getByText, queryByText } = renderWithProvider(
      <StakingEarningsHistory asset={erc20Asset} />,
      {
        state: mockInitialState,
      },
    );

    expect(getByText('Lifetime earnings')).toBeTruthy();
    expect(getByText('400 USDC')).toBeTruthy();
    expect(getByText('December')).toBeTruthy();
    expect(getByText('$100.59')).toBeTruthy();
    expect(getByText('+ 100 USDC')).toBeTruthy();
    expect(getByText('January')).toBeTruthy();
    expect(getByText('$301.78')).toBeTruthy();
    expect(getByText('+ 300 USDC')).toBeTruthy();
    expect(queryByText('November')).toBeFalsy();
  });

  it('should render correctly when switching currency setting', () => {
    (useStakingEarningsHistory as jest.Mock).mockReturnValue({
      earningsHistory: [
        {
          dateStr: '2022-12-31',
          dailyRewards: '100000000',
          sumRewards: '100000000',
        },
        {
          dateStr: '2023-01-01',
          dailyRewards: '300000000',
          sumRewards: '400000000',
        },
      ],
      isLoading: false,
      error: null,
    });

    const erc20Asset = {
      address: '0xUSDC000000000000000000000000000000000000',
      chainId: '0x1',
      name: 'USD Coin',
      symbol: 'USD Coin',
      ticker: 'USDC',
      isETH: false,
      decimals: 6,
    } as TokenI;

    const { getByText, queryByText } = renderWithProvider(
      <StakingEarningsHistory asset={erc20Asset} />,
      {
        state: {
          ...mockInitialState,
          engine: {
            ...mockInitialState.engine,
            backgroundState: {
              ...mockInitialState.engine.backgroundState,
              CurrencyRateController: {
                ...mockInitialState.engine.backgroundState
                  .CurrencyRateController,
                currentCurrency: 'xlm',
                currencyRates: {
                  ETH: {
                    conversionRate: 7683.22,
                  },
                },
              },
            },
          },
        },
      },
    );

    expect(getByText('Lifetime earnings')).toBeTruthy();
    expect(getByText('400 USDC')).toBeTruthy();
    expect(getByText('December')).toBeTruthy();
    expect(getByText('229.77 XLM')).toBeTruthy();
    expect(getByText('+ 100 USDC')).toBeTruthy();
    expect(getByText('January')).toBeTruthy();
    expect(getByText('689.3 XLM')).toBeTruthy();
    expect(getByText('+ 300 USDC')).toBeTruthy();
    expect(queryByText('November')).toBeFalsy();
  });

  it('renders correctly with inner and trailing zero values', () => {
    (useStakingEarningsHistory as jest.Mock).mockReturnValue({
      earningsHistory: [
        {
          dateStr: '2022-10-02',
          dailyRewards: '0',
          sumRewards: '0',
        },
        {
          dateStr: '2022-11-30',
          dailyRewards: '442219562575615',
          sumRewards: '442219562575615',
        },
        {
          dateStr: '2022-12-31',
          dailyRewards: '0',
          sumRewards: '442219562575615',
        },
        {
          dateStr: '2023-01-01',
          dailyRewards: '542219562575615',
          sumRewards: '984439125151230',
        },
      ],
      isLoading: false,
      error: null,
    });

    const { getByText, queryByText } = renderWithProvider(
      <StakingEarningsHistory asset={MOCK_STAKED_ETH_MAINNET_ASSET} />,
      {
        state: mockInitialState,
      },
    );

    expect(getByText('Lifetime earnings')).toBeTruthy();
    expect(getByText('0.00098 ETH')).toBeTruthy();
    expect(getByText('November')).toBeTruthy();
    expect(getByText('$1.49')).toBeTruthy();
    expect(getByText('+ 0.00044 ETH')).toBeTruthy();
    expect(getByText('December')).toBeTruthy();
    expect(getByText('+ 0 ETH')).toBeTruthy();
    expect(getByText('$0')).toBeTruthy();
    expect(getByText('January')).toBeTruthy();
    expect(getByText('$1.82')).toBeTruthy();
    expect(getByText('+ 0.00054 ETH')).toBeTruthy();
    expect(queryByText('October')).toBeFalsy();
  });

  it('calls onTimePeriodChange and updates the selected time period', () => {
    const { getByText } = renderWithProvider(
      <StakingEarningsHistory asset={MOCK_STAKED_ETH_MAINNET_ASSET} />,
      {
        state: mockInitialState,
      },
    );

    const timePeriodButton7D = getByText('7D');
    fireEvent.press(timePeriodButton7D);

    expect(getByText('December 31')).toBeTruthy();
    expect(getByText('$1.49')).toBeTruthy();
    expect(getByText('+ 0.00044 ETH')).toBeTruthy();
    expect(getByText('January 1')).toBeTruthy();
    expect(getByText('$1.82')).toBeTruthy();
    expect(getByText('+ 0.00054 ETH')).toBeTruthy();

    const timePeriodButtonY = getByText('Y');
    fireEvent.press(timePeriodButtonY);

    expect(getByText('2022')).toBeTruthy();
    expect(getByText('$1.49')).toBeTruthy();
    expect(getByText('+ 0.00044 ETH')).toBeTruthy();
    expect(getByText('2023')).toBeTruthy();
    expect(getByText('$1.82')).toBeTruthy();
    expect(getByText('+ 0.00054 ETH')).toBeTruthy();
  });
});
