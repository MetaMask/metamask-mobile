import React from 'react';
import { shallow } from 'enzyme';
import PaymentRequest from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});
describe('PaymentRequest', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <PaymentRequest />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
