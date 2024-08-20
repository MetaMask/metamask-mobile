import React from 'react';
import { shallow } from 'enzyme';
import { render } from '@testing-library/react-native';
import Identicon from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import useTokenList from '../../../components/hooks/DisplayName/useTokenList';

jest.mock('../../../components/hooks/DisplayName/useTokenList');

jest.mock('../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          rpcUrl: 'https://mainnet.infura.io/v3',
          chainId: '0x1',
          ticker: 'ETH',
          nickname: 'Ethereum mainnet',
          rpcPrefs: {
            blockExplorerUrl: 'https://etherscan.com',
          },
        },
      }),
      state: {
        networkConfigurations: {
          '673a4523-3c49-47cd-8d48-68dfc8a47a9c': {
            id: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
            rpcUrl: 'https://mainnet.infura.io/v3',
            chainId: '0x1',
            ticker: 'ETH',
            nickname: 'Ethereum mainnet',
            rpcPrefs: {
              blockExplorerUrl: 'https://etherscan.com',
            },
          },
        },
        selectedNetworkClientId: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
        networkMetadata: {},
      },
    },
  },
}));

describe('Identicon', () => {
  const mockStore = configureMockStore();
  const mockUseTokenList = jest.mocked(useTokenList).mockImplementation(() => [
    {
      name: 'test',
      symbol: 'test',
      decimals: 123,
      address: '0x123',
      occurrences: 1,
      aggregators: ['test'],
      iconUrl: 'https://test',
    },
  ]);

  it('should render correctly when provided address found in tokenList and iconUrl is available', () => {
    const addressMock = '0x0439e60f02a8900a951603950d8d4527f400c3f1';
    mockUseTokenList.mockImplementation(() => [
      {
        name: 'test',
        symbol: 'test',
        decimals: 123,
        address: addressMock,
        iconUrl: 'https://example.com/icon.png',
        occurrences: 1,
        aggregators: ['test'],
      },
    ]);

    const initialState = {
      settings: { useBlockieIcon: true },
    };
    const store = mockStore(initialState);

    const wrapper = render(
      <Provider store={store}>
        <Identicon address={addressMock} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render correctly when useBlockieIcon is true', () => {
    const initialState = {
      settings: { useBlockieIcon: true },
    };
    const store = mockStore(initialState);

    const wrapper = shallow(
      <Provider store={store}>
        <Identicon />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render correctly when useBlockieIcon is false', () => {
    const initialState = {
      settings: { useBlockieIcon: false },
    };
    const store = mockStore(initialState);

    const wrapper = shallow(
      <Provider store={store}>
        <Identicon />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
