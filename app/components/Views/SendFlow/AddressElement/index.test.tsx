import React from 'react';
import { shallow } from 'enzyme';
import AddressElement from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        network: '1',
      },
    },
  },
};
const store = mockStore(initialState);

describe('AddressElement', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <AddressElement />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
