import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { ChainId } from '@metamask/controller-utils';
import { render } from '@testing-library/react-native';

import NetworkMainAssetLogo from '.';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

jest.mock('../Swaps/components/TokenIcon', () => {
  const originalModule = jest.requireActual('../Swaps/components/TokenIcon');
  return {
    ...originalModule,
    __esModule: true,
    default: jest.fn(({ symbol }) => symbol),
  };
});

const mockInitialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
    },
  },
  network: {
    provider: {
      chainId: ChainId.mainnet,
      ticker: 'ETH',
    },
  },
};

describe('NetworkMainAssetLogo', () => {
  const mockStore = configureMockStore();
  const store = mockStore(mockInitialState);

  it('should renders correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <NetworkMainAssetLogo />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
