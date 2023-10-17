/* eslint-disable react/jsx-no-bind */
import React from 'react';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import BackupAlert from './';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  user: {
    seedphraseBackedUp: false,
    passwordSet: false,
  },
  wizard: {
    step: 0,
  },
};
const store = mockStore(initialState);

describe('BackupAlert', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <BackupAlert />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
