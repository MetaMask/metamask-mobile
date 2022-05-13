import React from 'react';
import { shallow } from 'enzyme';
import ExtensionSync from './';
import { Provider } from 'react-redux';
import createMockStore from 'redux-mock-store';

const mockStore = createMockStore();
const initialState = {
  user: {
    passwordSet: false,
    loadingSet: false,
    loadingMsg: '',
  },
  engine: {
    backgroundState: {
      PreferencesController: {
        selectedAddress: '',
      },
    },
  },
};
const store = mockStore(initialState);

describe('ExtensionSync', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <ExtensionSync />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
