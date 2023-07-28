import React from 'react';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import AccountRightButton from './';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const store = mockStore({
  engine: {
    backgroundState: initialBackgroundState,
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
