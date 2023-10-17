import React from 'react';
import { shallow } from 'enzyme';
import { UpdateNeeded } from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

describe('UpdateNeeded', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <UpdateNeeded />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
