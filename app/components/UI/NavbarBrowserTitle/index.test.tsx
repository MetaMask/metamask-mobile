import React from 'react';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import NavbarBrowserTitle from './';

const mockStore = configureMockStore();
const store = mockStore({});

describe('NavbarBrowserTitle', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <NavbarBrowserTitle hostname={'faucet.metamask.io'} https />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
