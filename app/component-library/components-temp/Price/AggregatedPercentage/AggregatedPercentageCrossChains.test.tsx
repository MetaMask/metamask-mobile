import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import AggregatedPercentageCrossChains from './AggregatedPercentageCrossChains';
import { Store } from 'redux';
import { TokensWithBalances } from '../../../../components/hooks/useGetFormattedTokensPerChain';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import {
  FORMATTED_PERCENTAGE_TEST_ID,
  FORMATTED_VALUE_PRICE_TEST_ID,
} from './AggregatedPercentage.constants';

// Mock constants and selectors
jest.mock('../../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(),
}));

const mockSelectTokenMarketData = selectTokenMarketData as unknown as jest.Mock;

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(() => 'USD'),
}));

jest.mock('ethereumjs-util', () => ({
  zeroAddress: jest.fn(() => '0x0000000000000000000000000000000000000000'),
}));

jest.mock('../../../../util/address', () => ({
  toChecksumAddress: jest.fn((address) => address),
}));

describe('AggregatedPercentageCrossChains', () => {
  const mockStore = configureStore([]);
  let store: Store;

  beforeEach(() => {
    store = mockStore({
      tokenRatesController: {
        marketData: {
          '1': {
            '0xTokenAddress': { pricePercentChange1d: 5 },
            '0x0000000000000000000000000000000000000000': {
              pricePercentChange1d: 3,
            },
          },
        },
      },
      currencyRateController: {
        currentCurrency: 'USD',
      },
    });
  });

  const testPositiveMarketData = {
    '0x1': {
      '0x0000000000000000000000000000000000000000': {
        allTimeHigh: 1.3510378694759928,
        allTimeLow: 0.0001199138679955242,
        circulatingSupply: 120442102.974199,
        currency: 'ETH',
        dilutedMarketCap: 120513769.0674126,
        high1d: 1.0196551936155827,
        id: 'ethereum',
        low1d: 0.9868614527890067,
        marketCap: 120513769.0674126,
        marketCapPercentChange1d: 0.43209,
        price: 1.0000692350710725,
        priceChange1d: 9.58,
        pricePercentChange14d: 15.624001792435491,
        pricePercentChange1d: 0.26612196896783435,
      },
      '0x6B175474E89094C44Da98b954EedeAC495271d0F': {
        allTimeHigh: 0.00033787994095450243,
        allTimeLow: 0.00024425950223297784,
        circulatingSupply: 3590801926.36846,
        currency: 'ETH',
        dilutedMarketCap: 994523.5027585331,
        high1d: 0.00027833552513055324,
        id: 'dai',
        low1d: 0.0002760612053968497,
        marketCap: 994523.5027585331,
        marketCapPercentChange1d: 1.94598,
        price: 0.0002768602083719757,
        priceChange1d: 0.00026184,
        pricePercentChange14d: 0.06084239990548266,
        pricePercentChange1d: 0.026199760027318986,
      },
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
        allTimeHigh: 0.00032403240239079335,
        allTimeLow: 0.00024306501355647231,
        circulatingSupply: 39913626551.4682,
        currency: 'ETH',
        dilutedMarketCap: 11055935.156778876,
        high1d: 0.0002780585743592791,
        id: 'usd-coin',
        low1d: 0.00027576902233315543,
        marketCap: 11051818.92055066,
        marketCapPercentChange1d: 0.05978,
        price: 0.000276807033823891,
        priceChange1d: -0.001160693663459944,
        pricePercentChange14d: -0.05092221365479972,
        pricePercentChange1d: 0.11599496417519209,
      },
    },
    '0x89': {
      '0x0000000000000000000000000000000000000000': {
        allTimeHigh: 1.9754341688014825,
        allTimeLow: 0.43865817360906284,
        circulatingSupply: 8081058250.420915,
        currency: 'POL',
        dilutedMarketCap: 10243600815.359032,
        high1d: 0.9992817966819728,
        id: 'polygon-ecosystem-token',
        low1d: 0.8791508977097724,
        marketCap: 8032270011.436278,
        marketCapPercentChange1d: 6.17765,
        price: 0.9962956752640171,
        priceChange1d: 0.03843712,
        pricePercentChange14d: 42.73351669766473,
        pricePercentChange1d: 6.278884861668764,
      },
      '0x750e4C4984a9e0f12978eA6742Bc1c5D248f40ed': {
        allTimeHigh: 1.88355350978746,
        allTimeLow: 1.3144508332318727,
        circulatingSupply: 0,
        currency: 'POL',
        dilutedMarketCap: 90736605.45696501,
        high1d: 1.539001038484876,
        id: 'axlusdc',
        low1d: 1.522920391813105,
        marketCap: 0,
        marketCapPercentChange1d: 0,
        price: 1.531344316900374,
        priceChange1d: -0.00066261854319527,
        pricePercentChange14d: 0.09924058418049628,
        pricePercentChange1d: 0.0661881094544663,
      },
    },
    '0xe708': {
      '0x0000000000000000000000000000000000000000': {
        allTimeHigh: 1.3510378694759928,
        allTimeLow: 0.0001199138679955242,
        circulatingSupply: 120442102.974199,
        currency: 'ETH',
        dilutedMarketCap: 120513769.0674126,
        high1d: 1.0196551936155827,
        id: 'ethereum',
        low1d: 0.9868614527890067,
        marketCap: 120513769.0674126,
        marketCapPercentChange1d: 0.43209,
        price: 1.0000692350710725,
        priceChange1d: 9.58,
        pricePercentChange14d: 15.624001792435491,
        pricePercentChange1d: 0.26612196896783435,
      },
    },
  };

  const testNegativeMarketData = {
    '0x1': {
      '0x0000000000000000000000000000000000000000': {
        allTimeHigh: 1.3510378694759928,
        allTimeLow: 0.0001199138679955242,
        circulatingSupply: 120442102.974199,
        currency: 'ETH',
        dilutedMarketCap: 120513769.0674126,
        high1d: 1.0196551936155827,
        id: 'ethereum',
        low1d: 0.9868614527890067,
        marketCap: 120513769.0674126,
        marketCapPercentChange1d: 0.43209,
        price: 1.0000692350710725,
        priceChange1d: 9.58,
        pricePercentChange14d: 15.624001792435491,
        pricePercentChange1d: -0.26612196896783435,
      },
      '0x6B175474E89094C44Da98b954EedeAC495271d0F': {
        allTimeHigh: 0.00033787994095450243,
        allTimeLow: 0.00024425950223297784,
        circulatingSupply: 3590801926.36846,
        currency: 'ETH',
        dilutedMarketCap: 994523.5027585331,
        high1d: 0.00027833552513055324,
        id: 'dai',
        low1d: 0.0002760612053968497,
        marketCap: 994523.5027585331,
        marketCapPercentChange1d: 1.94598,
        price: 0.0002768602083719757,
        priceChange1d: 0.00026184,
        pricePercentChange14d: 0.06084239990548266,
        pricePercentChange1d: -0.026199760027318986,
      },
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
        allTimeHigh: 0.00032403240239079335,
        allTimeLow: 0.00024306501355647231,
        circulatingSupply: 39913626551.4682,
        currency: 'ETH',
        dilutedMarketCap: 11055935.156778876,
        high1d: 0.0002780585743592791,
        id: 'usd-coin',
        low1d: 0.00027576902233315543,
        marketCap: 11051818.92055066,
        marketCapPercentChange1d: 0.05978,
        price: 0.000276807033823891,
        priceChange1d: -0.001160693663459944,
        pricePercentChange14d: -0.05092221365479972,
        pricePercentChange1d: -0.11599496417519209,
      },
    },
    '0x89': {
      '0x0000000000000000000000000000000000000000': {
        allTimeHigh: 1.9754341688014825,
        allTimeLow: 0.43865817360906284,
        circulatingSupply: 8081058250.420915,
        currency: 'POL',
        dilutedMarketCap: 10243600815.359032,
        high1d: 0.9992817966819728,
        id: 'polygon-ecosystem-token',
        low1d: 0.8791508977097724,
        marketCap: 8032270011.436278,
        marketCapPercentChange1d: 6.17765,
        price: 0.9962956752640171,
        priceChange1d: 0.03843712,
        pricePercentChange14d: 42.73351669766473,
        pricePercentChange1d: -6.278884861668764,
      },
      '0x750e4C4984a9e0f12978eA6742Bc1c5D248f40ed': {
        allTimeHigh: 1.88355350978746,
        allTimeLow: 1.3144508332318727,
        circulatingSupply: 0,
        currency: 'POL',
        dilutedMarketCap: 90736605.45696501,
        high1d: 1.539001038484876,
        id: 'axlusdc',
        low1d: 1.522920391813105,
        marketCap: 0,
        marketCapPercentChange1d: 0,
        price: 1.531344316900374,
        priceChange1d: -0.00066261854319527,
        pricePercentChange14d: 0.09924058418049628,
        pricePercentChange1d: -0.0661881094544663,
      },
    },
    '0xe708': {
      '0x0000000000000000000000000000000000000000': {
        allTimeHigh: 1.3510378694759928,
        allTimeLow: 0.0001199138679955242,
        circulatingSupply: 120442102.974199,
        currency: 'ETH',
        dilutedMarketCap: 120513769.0674126,
        high1d: 1.0196551936155827,
        id: 'ethereum',
        low1d: 0.9868614527890067,
        marketCap: 120513769.0674126,
        marketCapPercentChange1d: 0.43209,
        price: 1.0000692350710725,
        priceChange1d: 9.58,
        pricePercentChange14d: 15.624001792435491,
        pricePercentChange1d: -0.26612196896783435,
      },
    },
  };

  it('should match snapshot', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <AggregatedPercentageCrossChains
          privacyMode={false}
          totalFiatCrossChains={1000}
          tokenFiatBalancesCrossChains={[
            {
              chainId: '1',
              nativeFiatValue: 500,
              tokenFiatBalances: [300, 200],
              tokensWithBalances: [
                { address: '0xTokenAddress' },
                { address: '0xAnotherToken' },
              ] as TokensWithBalances[],
            },
          ]}
        />
      </Provider>,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('should return positive amount change if market data is all positive', () => {
    mockSelectTokenMarketData.mockReturnValue(testPositiveMarketData);
    const testTokenFiatBalancesCrossChains: {
      chainId: string;
      nativeFiatValue: number;
      tokenFiatBalances: number[];
      tokensWithBalances: TokensWithBalances[];
    }[] = [
      {
        chainId: '0x1',
        tokensWithBalances: [
          {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            symbol: 'USDC',
            decimals: 6,
            balance: '3.08657',
            tokenBalanceFiat: 3.11,
          },
          {
            address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            symbol: 'DAI',
            decimals: 18,
            balance: '4.00229',
            tokenBalanceFiat: 4.03,
          },
        ],
        tokenFiatBalances: [3.11, 4.03],
        nativeFiatValue: 79.49,
      },
      {
        chainId: '0xe708',
        tokensWithBalances: [],
        tokenFiatBalances: [],
        nativeFiatValue: 0,
      },
      {
        chainId: '0x89',
        tokensWithBalances: [
          {
            address: '0x750e4C4984a9e0f12978eA6742Bc1c5D248f40ed',
            symbol: 'AXLUSDC',
            decimals: 6,
            balance: '12.87735',
            tokenBalanceFiat: 12.8,
          },
        ],
        tokenFiatBalances: [12.8],
        nativeFiatValue: 9.28,
      },
    ];
    const { getByTestId } = render(
      <Provider store={store}>
        <AggregatedPercentageCrossChains
          privacyMode={false}
          totalFiatCrossChains={108.71}
          tokenFiatBalancesCrossChains={testTokenFiatBalancesCrossChains}
        />
      </Provider>,
    );

    const formattedValuePriceElement = getByTestId(
      FORMATTED_VALUE_PRICE_TEST_ID,
    );
    const formattedValuePercentageElement = getByTestId(
      FORMATTED_PERCENTAGE_TEST_ID,
    );

    expect(formattedValuePriceElement).toBeDefined();
    expect(formattedValuePercentageElement).toBeDefined();
    expect(formattedValuePriceElement.props.children).toBe('+0.77 USD ');
    expect(formattedValuePercentageElement.props.children).toBe('(+0.72%)');
  });

  it('should return negative amount change if market data is all negative', () => {
    mockSelectTokenMarketData.mockReturnValue(testNegativeMarketData);
    const testTokenFiatBalancesCrossChains: {
      chainId: string;
      nativeFiatValue: number;
      tokenFiatBalances: number[];
      tokensWithBalances: TokensWithBalances[];
    }[] = [
      {
        chainId: '0x1',
        tokensWithBalances: [
          {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            symbol: 'USDC',
            decimals: 6,
            balance: '3.08657',
            tokenBalanceFiat: 3.11,
          },
          {
            address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            symbol: 'DAI',
            decimals: 18,
            balance: '4.00229',
            tokenBalanceFiat: 4.03,
          },
        ],
        tokenFiatBalances: [3.11, 4.03],
        nativeFiatValue: 79.49,
      },
      {
        chainId: '0xe708',
        tokensWithBalances: [],
        tokenFiatBalances: [],
        nativeFiatValue: 0,
      },
      {
        chainId: '0x89',
        tokensWithBalances: [
          {
            address: '0x750e4C4984a9e0f12978eA6742Bc1c5D248f40ed',
            symbol: 'AXLUSDC',
            decimals: 6,
            balance: '12.87735',
            tokenBalanceFiat: 12.8,
          },
        ],
        tokenFiatBalances: [12.8],
        nativeFiatValue: 9.28,
      },
    ];
    const { getByTestId } = render(
      <Provider store={store}>
        <AggregatedPercentageCrossChains
          privacyMode={false}
          totalFiatCrossChains={108.71}
          tokenFiatBalancesCrossChains={testTokenFiatBalancesCrossChains}
        />
      </Provider>,
    );

    const formattedValuePriceElement = getByTestId(
      FORMATTED_VALUE_PRICE_TEST_ID,
    );
    const formattedValuePercentageElement = getByTestId(
      FORMATTED_PERCENTAGE_TEST_ID,
    );

    expect(formattedValuePriceElement).toBeDefined();
    expect(formattedValuePercentageElement).toBeDefined();
    expect(formattedValuePriceElement.props.children).toBe('-0.85 USD ');
    expect(formattedValuePercentageElement.props.children).toBe('(-0.77%)');
  });
});
