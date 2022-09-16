import React from 'react';
import { shallow } from 'enzyme';
import Tokens from './';
import configureMockStore from 'redux-mock-store';
import { BN } from 'ethereumjs-util';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();

describe('Tokens', () => {
  it('should render correctly', () => {
    const initialState = {
      engine: {
        backgroundState: {
          TokensController: {
            tokens: [],
          },
          TokenListController: {
            tokenList: {},
          },
          TokenRatesController: {
            contractExchangeRates: {},
          },
          CurrencyRateController: {
            currentCurrency: 'USD',
            conversionRate: 1,
          },
          TokenBalancesController: {
            contractBalance: {},
          },
          NetworkController: {
            provider: { chainId: '1' },
          },
          PreferencesController: { useTokenDetection: true },
        },
      },
      settings: {
        primaryCurrency: 'usd',
      },
    };
    const store = mockStore(initialState);

    const wrapper = shallow(
      <Provider store={store}>
        <Tokens />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });

  it('should hide zero balance tokens when setting is on', () => {
    const initialState = {
      engine: {
        backgroundState: {
          TokensController: {
            tokens: [
              { symbol: 'ETH', address: '0x0', decimals: 18, isETH: true },
              { symbol: 'BAT', address: '0x01', decimals: 18 },
              { symbol: 'LINK', address: '0x02', decimals: 18 },
            ],
          },
          TokenListController: {
            tokenList: {},
          },
          TokenRatesController: {
            contractExchangeRates: {},
          },
          CurrencyRateController: {
            currentCurrency: 'USD',
            conversionRate: 1,
          },
          TokenBalancesController: {
            contractBalances: {
              '0x01': new BN(2),
              '0x02': new BN(0),
            },
          },
          NetworkController: {
            provider: { chainId: '1' },
          },
          PreferencesController: { useTokenDetection: true },
        },
      },
      settings: {
        primaryCurrency: 'usd',
        hideZeroBalanceTokens: true,
      },
    };
    const store = mockStore(initialState);

    const wrapper = shallow(
      <Provider store={store}>
        <Tokens
          tokens={initialState.engine.backgroundState.TokensController.tokens}
        />
      </Provider>,
    );
    // ETH and BAT should display
    expect(wrapper.dive()).toMatchSnapshot();
  });

  it('should show all balance tokens when hideZeroBalanceTokens setting is off', () => {
    const initialState = {
      engine: {
        backgroundState: {
          TokensController: {
            tokens: [
              { symbol: 'ETH', address: '0x0', decimals: 18, isETH: true },
              { symbol: 'BAT', address: '0x01', decimals: 18 },
              { symbol: 'LINK', address: '0x02', decimals: 18 },
            ],
          },
          TokenListController: {
            tokenList: {},
          },
          TokenRatesController: {
            contractExchangeRates: {},
          },
          CurrencyRateController: {
            currentCurrency: 'USD',
            conversionRate: 1,
          },
          TokenBalancesController: {
            contractBalances: {
              '0x01': new BN(2),
              '0x02': new BN(0),
            },
          },
          NetworkController: {
            provider: { chainId: '1' },
          },
          PreferencesController: { useTokenDetection: true },
        },
      },
      settings: {
        primaryCurrency: 'usd',
        hideZeroBalanceTokens: false,
      },
    };
    const store = mockStore(initialState);

    const wrapper = shallow(
      <Provider store={store}>
        <Tokens
          tokens={initialState.engine.backgroundState.TokensController.tokens}
        />
      </Provider>,
    );
    // All three should display
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
