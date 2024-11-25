import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import AssetSearch from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import Engine from '../../../core/Engine';
const mockedEngine = Engine;

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init({}),
  context: {
    KeyringController: {
      getQRKeyringState: async () => ({ subscribe: () => ({}) }),
    },
    TokenListController: {
      tokenList: {
        '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f': {
          address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
          symbol: 'SNX',
          decimals: 18,
          name: 'Synthetix Network Token',
          iconUrl:
            'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f.png',
          type: 'erc20',
          aggregators: [
            'Aave',
            'Bancor',
            'CMC',
            'Crypto.com',
            'CoinGecko',
            '1inch',
            'PMM',
            'Synthetix',
            'Zerion',
            'Lifi',
          ],
          occurrences: 10,
          fees: {
            '0x5fd79d46eba7f351fe49bff9e87cdea6c821ef9f': 0,
            '0xda4ef8520b1a57d7d63f1e249606d1a459698876': 0,
          },
        },
      },
      tokensChainsCache: {},
      preventPollingOnNetworkRestart: false,
    },
  },
}));

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('AssetSearch', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <AssetSearch onSearch={jest.fn} onFocus={jest.fn} onBlur={jest.fn} />,
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
