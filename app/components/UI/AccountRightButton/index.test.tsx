import React from 'react';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import AccountRightButton from './';

const mockStore = configureMockStore();
const store = mockStore({
  engine: {
    backgroundState: {
      PreferencesController: {
        selectedAddress: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
      },
    },
  },
});

describe('AccountRightButton', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <AccountRightButton />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
