import React from 'react';
import { render } from '@testing-library/react-native';
import OnboardingCarousel from './';
import { Provider } from 'react-redux';
import createMockStore from 'redux-mock-store';
import { ThemeContext, mockTheme } from '../../../util/theme';

const mockStore = createMockStore();
const initialState = {};
const store = mockStore(initialState);

describe('OnboardingCarousel', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <OnboardingCarousel />
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
