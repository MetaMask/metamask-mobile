import React from 'react';
import { shallow } from 'enzyme';
import Contacts from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};
const store = mockStore(initialState);

describe('Contacts', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Contacts />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
