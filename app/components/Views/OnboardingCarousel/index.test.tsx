import React from 'react';
import { render } from '@testing-library/react-native';
import OnboardingCarousel from './';
import { Provider } from 'react-redux';
import createMockStore from 'redux-mock-store';

const mockStore = createMockStore();
const initialState = {};
const store = mockStore(initialState);

describe('OnboardingCarousel', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <OnboardingCarousel />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
