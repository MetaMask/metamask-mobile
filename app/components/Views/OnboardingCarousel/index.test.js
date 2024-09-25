import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import OnboardingCarousel from './index';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { OnboardingCarouselSelectorIDs } from '../../../../e2e/selectors/Onboarding/OnboardingCarousel.selectors';

const mockStore = configureStore([]);
const store = mockStore({});
const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
};

describe('OnboardingCarousel', () => {
  it('should render the component', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>

        <OnboardingCarousel navigation={mockNavigation} />
        </ThemeContext.Provider>
      </Provider>,
    );

    expect(getByTestId(OnboardingCarouselSelectorIDs.CONTAINER_ID)).toBeTruthy();
  });
});
