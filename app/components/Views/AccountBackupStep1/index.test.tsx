import React from 'react';
import { shallow } from 'enzyme';
import AccountBackupStep1 from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        provider: {
          chainId: '1',
        },
      },
    },
  },
};
const store = mockStore(initialState);

describe('AccountBackupStep1', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <AccountBackupStep1 />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
