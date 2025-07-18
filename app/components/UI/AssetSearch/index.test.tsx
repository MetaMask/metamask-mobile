import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import AssetSearch from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import Engine from '../../../core/Engine';
import { ImportTokenViewSelectorsIDs } from '../../../../e2e/selectors/wallet/ImportTokenView.selectors';
import { fireEvent } from '@testing-library/react-native';
const mockedEngine = Engine;

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init({}),
  context: {
    KeyringController: {
      getQRKeyringState: async () => ({ subscribe: () => ({}) }),
    },
    TokenListController: {
      tokensChainsCache: {
        '0x1': {
          data: [
            {
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
          ],
        },
      },
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
      <AssetSearch
        onSearch={jest.fn}
        onFocus={jest.fn}
        onBlur={jest.fn}
        allNetworksEnabled
      />,
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should call onSearch', () => {
    const onSearch = jest.fn();
    const { getByTestId } = renderWithProvider(
      <AssetSearch
        onSearch={onSearch}
        onFocus={jest.fn}
        onBlur={jest.fn}
        allNetworksEnabled
      />,
      { state: initialState },
    );
    const clearSearchBar = getByTestId(
      ImportTokenViewSelectorsIDs.CLEAR_SEARCH_BAR,
    );
    fireEvent.press(clearSearchBar);

    expect(onSearch).toHaveBeenCalled();
  });

  it('should filter tokens for popular networks only when allNetworksEnabled is true', () => {
    const mockStateWithAllNetworks = {
      ...initialState,
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          TokenListController: {
            tokensChainsCache: {
              '0x1': {
                data: {
                  '0x1tokenAddress': {
                    address: '0x1tokenAddress',
                    symbol: 'MAINNET_TOKEN',
                    chainId: '0x1',
                  },
                },
              },
              '0x89': {
                data: {
                  '0x89tokenAddress': {
                    address: '0x89tokenAddress',
                    symbol: 'POLYGON_TOKEN',
                    chainId: '0x89',
                  },
                },
              },
              '0x999': {
                data: {
                  '0x999tokenAddress': {
                    address: '0x999tokenAddress',
                    symbol: 'UNSUPPORTED_TOKEN',
                    chainId: '0x999',
                  },
                },
              },
            },
          },
        },
      },
    };

    const mockAssetSearchOnSearch = jest.fn();

    const { getByTestId } = renderWithProvider(
      <AssetSearch
        onSearch={mockAssetSearchOnSearch}
        onFocus={jest.fn()}
        onBlur={jest.fn()}
        allNetworksEnabled={true}
      />,
      { state: mockStateWithAllNetworks },
    );

    const searchBar = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);
    fireEvent.changeText(searchBar, 'TOKEN');

    // Verify that only tokens from popular networks (mainnet and polygon) are included
    expect(mockAssetSearchOnSearch).toHaveBeenCalled();
    const lastCall = mockAssetSearchOnSearch.mock.calls[mockAssetSearchOnSearch.mock.calls.length - 1];
    const results = lastCall[0].results;
    
    // Should include mainnet and polygon tokens but not unsupported network tokens
    const tokenSymbols = results.map((token: any) => token.symbol);
    expect(tokenSymbols).toContain('MAINNET_TOKEN');
    expect(tokenSymbols).toContain('POLYGON_TOKEN');
    expect(tokenSymbols).not.toContain('UNSUPPORTED_TOKEN');
  });
});
