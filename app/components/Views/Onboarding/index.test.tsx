import React from 'react';
import { shallow } from 'enzyme';
import Onboarding from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

describe('Onboarding', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Onboarding />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
