import React from 'react';
import configureMockStore from 'redux-mock-store';
import { render } from '@testing-library/react-native';
import AddAsset from './';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        providerConfig: {
          chainId: '1',
          type: 'mainnet',
        },
      },
      PreferencesController: {
        useNftDetection: true,
      },
    },
  },
};
const store = mockStore(initialState);

describe('AddAsset', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <AddAsset route={{ params: { assetType: 'token' } }} />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
