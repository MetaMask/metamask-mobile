import React from 'react';
import AccountApproval from './';
import { shallow } from 'enzyme';
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

describe('AccountApproval', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <AccountApproval
          currentPageInformation={{ icon: '', url: '', title: '' }}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
