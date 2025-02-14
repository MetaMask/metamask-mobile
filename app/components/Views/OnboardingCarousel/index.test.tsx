import React from 'react';
import { waitFor } from '@testing-library/react-native';
import OnboardingCarousel from './';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { OnboardingCarouselSelectorIDs } from '../../../../e2e/selectors/Onboarding/OnboardingCarousel.selectors';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Device from '../../../util/device';

jest.mock('../../../util/metrics/TrackOnboarding/trackOnboarding');
jest.mock('../../../util/test/utils', () => ({
  isTest: true,
}));

jest.mock('../../../util/device', () => ({
  isAndroid: jest.fn(),
  isIphoneX: jest.fn(),
  isIphone5S: jest.fn(),
  isIos: jest.fn(),
}));

const mockNavigate: jest.Mock = jest.fn();
const mockSetOptions: jest.Mock = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  setOptions: mockSetOptions,
} as unknown as NavigationProp<ParamListBase>;

describe('OnboardingCarousel', () => {
  beforeEach(() => {
    (Device.isAndroid as jest.Mock).mockReset();
    (Device.isIphoneX as jest.Mock).mockReset();
    (Device.isIphone5S as jest.Mock).mockReset();
    (Device.isIos as jest.Mock).mockReset();

    (Device.isAndroid as jest.Mock).mockReturnValue(false);
    (Device.isIphoneX as jest.Mock).mockReturnValue(false);
    (Device.isIphone5S as jest.Mock).mockReturnValue(false);
    (Device.isIos as jest.Mock).mockReturnValue(true);
  });

  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <OnboardingCarousel navigation={mockNavigation} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render the App Start Time text when isTest is true', async () => {
    const { toJSON, getByTestId } = renderWithProvider(
      <OnboardingCarousel navigation={mockNavigation} />,
    );
    expect(toJSON()).toMatchSnapshot();

    await waitFor(() => {
      expect(
        getByTestId(OnboardingCarouselSelectorIDs.APP_START_TIME_ID),
      ).toBeTruthy();
    });
  });

  describe('Image Padding', () => {
    it('should use iPhone X padding', () => {
      (Device.isAndroid as jest.Mock).mockReturnValue(false);
      (Device.isIphoneX as jest.Mock).mockReturnValue(true);
      (Device.isIos as jest.Mock).mockReturnValue(true);

      const { toJSON } = renderWithProvider(
        <OnboardingCarousel navigation={mockNavigation} />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should use iPhone 5S padding', () => {
      (Device.isAndroid as jest.Mock).mockReturnValue(false);
      (Device.isIphoneX as jest.Mock).mockReturnValue(false);
      (Device.isIphone5S as jest.Mock).mockReturnValue(true);
      (Device.isIos as jest.Mock).mockReturnValue(true);

      const { toJSON } = renderWithProvider(
        <OnboardingCarousel navigation={mockNavigation} />,
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
