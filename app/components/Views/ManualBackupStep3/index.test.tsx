import React from 'react';
import ManualBackupStep3 from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {};
const store = mockStore(initialState);

describe('ManualBackupStep3', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <ManualBackupStep3 />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
