import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { ChainId } from '@metamask/controller-utils';
import { render } from '@testing-library/react-native';

import NetworkMainAssetLogo from '.';
import { backgroundState } from '../../../util/test/initial-root-state';
import mockedEngine from '../../../core/__mocks__/MockedEngine';

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
    backgroundState,
  },
  network: {
    provider: {
      chainId: ChainId.mainnet,
      ticker: 'ETH',
    },
  },
};

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

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
