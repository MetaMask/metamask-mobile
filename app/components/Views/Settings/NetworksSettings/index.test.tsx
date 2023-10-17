import React from 'react';
import { shallow } from 'enzyme';
import NetworksSettings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
  privacy: {
    thirdPartyApiMode: true,
  },
};
const store = mockStore(initialState);

describe('NetworksSettings', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <NetworksSettings />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
