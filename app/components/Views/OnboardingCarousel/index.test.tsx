import React from 'react';
import { shallow } from 'enzyme';
import OnboardingCarousel from './';
import { Provider } from 'react-redux';
import createMockStore from 'redux-mock-store';

const mockStore = createMockStore();
const initialState = {};
const store = mockStore(initialState);

describe('OnboardingCarousel', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <OnboardingCarousel />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
