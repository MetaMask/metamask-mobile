import React from 'react';
import { shallow } from 'enzyme';
import TransactionsView from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});
describe('TransactionsView', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <TransactionsView />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
