import React from 'react';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';
import OfflineMode from './';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  infuraAvailability: {
    isBlocked: false,
  },
};
const store = mockStore(initialState);

describe('OfflineMode', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <OfflineMode />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
