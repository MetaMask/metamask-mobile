import React from 'react';
import OptinMetrics from './';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  onboarding: {
    event: 'event',
  },
};
const store = mockStore(initialState);

describe('OptinMetrics', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <OptinMetrics />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
