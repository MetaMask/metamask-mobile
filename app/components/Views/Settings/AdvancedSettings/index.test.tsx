import React from 'react';
import { shallow } from 'enzyme';
import AdvancedSettings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  settings: { showHexData: true },
  engine: {
    backgroundState: {
      PreferencesController: {
        ipfsGateway: 'https://ipfs.io/ipfs/',
      },
      NetworkController: {
        provider: { chainId: '1' },
      },
    },
  },
};
const store = mockStore(initialState);

describe('AdvancedSettings', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <AdvancedSettings />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
