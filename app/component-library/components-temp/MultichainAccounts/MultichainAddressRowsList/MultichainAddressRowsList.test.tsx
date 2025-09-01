import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { InternalAccount } from '@metamask/keyring-internal-api';

import MultichainAddressRowsList from './MultichainAddressRowsList';

const mockStore = configureStore([]);

const createMockAccount = (
  address: string,
  scopes: string[],
): InternalAccount => ({
  id: `account-${address}`,
  address,
  metadata: {
    name: `Account ${address}`,
    importTime: Date.now(),
    keyring: { type: 'HD Key Tree' },
  },
  options: {},
  methods: [],
  type: 'eip155:eoa',
  scopes: scopes as `${string}:${string}`[],
});

const createMockState = () => ({
  engine: {
    backgroundState: {
      NetworkController: {
        networkConfigurationsByChainId: {
          '0x1': { name: 'Ethereum Mainnet', chainId: '0x1' },
          '0x89': { name: 'Polygon Mainnet', chainId: '0x89' },
        },
      },
      MultichainNetworkController: {
        multichainNetworkConfigurationsByChainId: {
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
            name: 'Solana',
            chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          },
        },
      },
    },
  },
});

const renderComponent = (props = {}) => {
  const store = mockStore(createMockState());
  return render(
    <Provider store={store}>
      <MultichainAddressRowsList {...props} />
    </Provider>,
  );
};

describe('MultichainAddressRowsList', () => {
  it('renders correctly with default props', () => {
    const { getByTestId } = renderComponent();
    expect(getByTestId('multichain-address-rows-list')).toBeTruthy();
    expect(getByTestId('multichain-address-rows-list-search')).toBeTruthy();
  });

  it('shows empty message when no accounts provided', () => {
    const { getByTestId } = renderComponent({ accounts: [] });
    expect(
      getByTestId('multichain-address-rows-list-empty-message'),
    ).toBeTruthy();
  });

  it('renders network rows for accounts with network scopes', () => {
    const accounts = [
      createMockAccount('0x123', [
        'eip155:0x1',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      ]),
    ];

    const { getByText } = renderComponent({ accounts });
    expect(getByText('Ethereum Mainnet')).toBeTruthy();
    expect(getByText('Solana')).toBeTruthy();
  });
});
