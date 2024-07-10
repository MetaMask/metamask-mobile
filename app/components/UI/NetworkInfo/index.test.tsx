import React from 'react';
import { render, screen } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import NetworkInfo from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { NetworkEducationModalSelectorsIDs } from '../../../../e2e/selectors/Modals/NetworkEducationModal.selectors';

const mockStore = configureMockStore();
const initialState = {
  privacy: {
    approvedHosts: {},
  },
  engine: {
    backgroundState,
  },
  network: {
    providerConfig: {
      type: 'mainnet',
      ticker: 'ETH',
      rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID',
      chainId: '1',
    },
  },
  settings: {
    isTokenDetectionEnabled: true,
  },
};

const store = mockStore(initialState);

describe('NetworkInfo', () => {
  it('should render correctly when token detection is enabled', () => {
    render(
      <Provider store={store}>
        <NetworkInfo type={'mainnet'} onClose={jest.fn()} ticker={'ETH'} />
      </Provider>,
    );
    expect(
      screen.getByTestId(NetworkEducationModalSelectorsIDs.CONTAINER),
    ).not.toBeNull();
    expect(
      screen.getByTestId(NetworkEducationModalSelectorsIDs.NETWORK_NAME),
    ).not.toBeNull();
    expect(screen.getByText('ETH')).not.toBeNull();
    expect(screen.getByText('Token detection enabled')).not.toBeNull();
    expect(
      screen.getByTestId(NetworkEducationModalSelectorsIDs.CLOSE_BUTTON),
    ).not.toBeNull();
  });

  it('should render correctly when token detection is disabled', () => {
    const disabledState = {
      ...initialState,
      settings: {
        isTokenDetectionEnabled: false,
      },
    };
    const disabledStore = mockStore(disabledState);

    render(
      <Provider store={disabledStore}>
        <NetworkInfo type={'mainnet'} onClose={jest.fn()} ticker={'ETH'} />
      </Provider>,
    );
    expect(
      screen.getByTestId(NetworkEducationModalSelectorsIDs.CONTAINER),
    ).not.toBeNull();
    expect(
      screen.getByTestId(NetworkEducationModalSelectorsIDs.NETWORK_NAME),
    ).not.toBeNull();
    expect(screen.getByText('ETH')).not.toBeNull();
    expect(screen.queryByText('Token detection enabled')).toBeNull();
    expect(
      screen.getByTestId(NetworkEducationModalSelectorsIDs.CLOSE_BUTTON),
    ).not.toBeNull();
  });
});
