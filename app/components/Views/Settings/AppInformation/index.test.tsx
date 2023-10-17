import React from 'react';
import { shallow } from 'enzyme';
import AppInformation from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

describe('AppInformation', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <AppInformation route={{ params: {} }} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
