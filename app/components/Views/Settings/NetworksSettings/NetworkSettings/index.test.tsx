import React from 'react';
import { shallow } from 'enzyme';
import NetworkSettings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
  networkOnboarded: {
    networkOnboardedState: { '1': true },
  },
  privacy: {
    thirdPartyApiMode: true,
  },
};
const store = mockStore(initialState);

describe('NetworkSettings', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <NetworkSettings />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
