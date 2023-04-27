import React from 'react';
import { shallow } from 'enzyme';
import DrawerView from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

describe('DrawerView', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <DrawerView />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
