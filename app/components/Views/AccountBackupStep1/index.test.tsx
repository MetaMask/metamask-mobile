import React from 'react';
import { shallow } from 'enzyme';
import AccountBackupStep1 from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
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
