import React from 'react';
import { shallow } from 'enzyme';
import Step1 from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const store = mockStore({});

describe('Step1', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Step1 />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
