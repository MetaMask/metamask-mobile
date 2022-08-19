import React from 'react';
import { shallow } from 'enzyme';
import Step2 from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const store = mockStore({});

describe('Step2', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Step2 />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
