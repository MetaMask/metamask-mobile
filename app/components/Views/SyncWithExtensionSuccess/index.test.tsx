import React from 'react';
import { shallow } from 'enzyme';
import SyncWithExtensionSuccess from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {};
const store = mockStore(initialState);

describe('SyncWithExtensionSuccess', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <SyncWithExtensionSuccess />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
