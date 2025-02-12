import React from 'react';
import { waitFor } from '@testing-library/react-native';
import OnboardingCarousel from './';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { OnboardingCarouselSelectorIDs } from '../../../../e2e/selectors/Onboarding/OnboardingCarousel.selectors';
import renderWithProvider from '../../../util/test/renderWithProvider';

jest.mock('../../../util/metrics/TrackOnboarding/trackOnboarding');
jest.mock('../../../util/test/utils', () => ({
  isTest: true,
}));

const mockNavigate: jest.Mock = jest.fn();
const mockSetOptions: jest.Mock = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  setOptions: mockSetOptions,
} as unknown as NavigationProp<ParamListBase>;


describe('OnboardingCarousel', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <OnboardingCarousel navigation={mockNavigation}/>
    );
    expect(toJSON()).toMatchSnapshot();
  });

    it('should render the App Start Time text when isTest is true', async () => {
      const { toJSON, getByTestId } = renderWithProvider(
        <OnboardingCarousel navigation={mockNavigation}/>
      );
      expect(toJSON()).toMatchSnapshot();

    await waitFor(() => {
      expect(
        getByTestId(OnboardingCarouselSelectorIDs.APP_START_TIME_ID),
      ).toBeTruthy();
    });
  });
});
