import React from 'react';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import AddAsset from './';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        provider: {
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
    const wrapper = shallow(
      <Provider store={store}>
        <AddAsset route={{ params: { assetType: 'token' } }} />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
