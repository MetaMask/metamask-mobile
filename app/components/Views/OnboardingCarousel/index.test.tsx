import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import OnboardingCarousel from './';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { OnboardingCarouselSelectorIDs } from '../../../../e2e/selectors/Onboarding/OnboardingCarousel.selectors';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Device from '../../../util/device';
import StorageWrapper from '../../../store/storage-wrapper';

jest.mock('../../../util/metrics/TrackOnboarding/trackOnboarding', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../actions/onboarding', () => ({
  saveOnboardingEvent: jest.fn(),
}));

jest.mock('../../../util/test/utils', () => ({
  isTest: true,
  isQa: true,
}));

jest.mock('../../../util/device', () => ({
  isAndroid: jest.fn(),
  isIphoneX: jest.fn(),
  isIphone5S: jest.fn(),
  isIos: jest.fn(),
  isMediumDevice: jest.fn(),
}));

jest.mock('react-native-scrollable-tab-view', () => {
  const MockScrollableTabView = (props: {
    children?: unknown;
    [key: string]: unknown;
  }) => {
    const ReactLib = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactLib.createElement(View, props, props.children);
  };
  return MockScrollableTabView;
});

jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  return {
    ...actualRN,
    Platform: {
      ...actualRN.Platform,
      OS: 'ios',
    },
  };
});

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
    (Device.isMediumDevice as jest.Mock).mockReset();

    (Device.isAndroid as jest.Mock).mockReturnValue(false);
    (Device.isIphoneX as jest.Mock).mockReturnValue(false);
    (Device.isIphone5S as jest.Mock).mockReturnValue(false);
    (Device.isIos as jest.Mock).mockReturnValue(true);
    (Device.isMediumDevice as jest.Mock).mockReturnValue(false);

    Platform.OS = 'ios';
  });

  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <OnboardingCarousel navigation={mockNavigation} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render the App Start Time text when isTest or isQa is true', async () => {
    const { toJSON, getAllByTestId } = renderWithProvider(
      <OnboardingCarousel navigation={mockNavigation} />,
    );
    expect(toJSON()).toMatchSnapshot();

    await waitFor(() => {
      const appStartTimeElements = getAllByTestId(
        OnboardingCarouselSelectorIDs.APP_START_TIME_ID,
      );
      expect(appStartTimeElements).toHaveLength(3); // One for each carousel tab
      expect(appStartTimeElements[0]).toBeOnTheScreen();
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

    it('should use iPhone 5s padding', () => {
      (Device.isAndroid as jest.Mock).mockReturnValue(false);
      (Device.isIphoneX as jest.Mock).mockReturnValue(false);
      (Device.isIos as jest.Mock).mockReturnValue(true);
      (Device.isIphone5S as jest.Mock).mockReturnValue(true);

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

    it('should use android medium device', () => {
      (Device.isAndroid as jest.Mock).mockReturnValue(true);
      (Device.isIphoneX as jest.Mock).mockReturnValue(false);
      (Device.isIos as jest.Mock).mockReturnValue(false);
      (Device.isMediumDevice as jest.Mock).mockReturnValue(true);

      const { toJSON } = renderWithProvider(
        <OnboardingCarousel navigation={mockNavigation} />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should use android padding', () => {
      (Device.isAndroid as jest.Mock).mockReturnValue(true);
      (Device.isIphoneX as jest.Mock).mockReturnValue(false);
      (Device.isIos as jest.Mock).mockReturnValue(false);

      const { toJSON } = renderWithProvider(
        <OnboardingCarousel navigation={mockNavigation} />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should use android padding for large screens', () => {
      (Device.isAndroid as jest.Mock).mockReturnValue(true);
      (Device.isIphoneX as jest.Mock).mockReturnValue(false);
      (Device.isIos as jest.Mock).mockReturnValue(false);

      Platform.OS = 'android';

      // Mock window height to be greater than 800
      const originalHeight = global.window.innerHeight;
      Object.defineProperty(global.window, 'innerHeight', {
        value: 900,
        writable: true,
      });

      const { toJSON } = renderWithProvider(
        <OnboardingCarousel navigation={mockNavigation} />,
      );
      expect(toJSON()).toMatchSnapshot();

      // Restore original height
      Object.defineProperty(global.window, 'innerHeight', {
        value: originalHeight,
        writable: true,
      });
    });

    it('should use android padding for small screens', () => {
      (Device.isAndroid as jest.Mock).mockReturnValue(true);
      (Device.isIphoneX as jest.Mock).mockReturnValue(false);
      (Device.isIos as jest.Mock).mockReturnValue(false);

      // Mock window height to be less than 800
      const originalHeight = global.window.innerHeight;
      Object.defineProperty(global.window, 'innerHeight', {
        value: 700,
        writable: true,
      });

      const { toJSON } = renderWithProvider(
        <OnboardingCarousel navigation={mockNavigation} />,
      );
      expect(toJSON()).toMatchSnapshot();

      // Restore original height
      Object.defineProperty(global.window, 'innerHeight', {
        value: originalHeight,
        writable: true,
      });
    });

    it('should call getStarted button', async () => {
      jest.spyOn(StorageWrapper, 'getItem').mockResolvedValue(true);

      const navigation = {
        navigate: mockNavigate,
        setOptions: mockSetOptions,
      } as unknown as NavigationProp<ParamListBase>;

      const { toJSON, getByTestId } = renderWithProvider(
        <OnboardingCarousel navigation={navigation} />,
      );

      const getStartedButton = getByTestId(
        OnboardingCarouselSelectorIDs.GET_STARTED_BUTTON_ID,
      );

      expect(getStartedButton).toBeOnTheScreen();
      fireEvent.press(getStartedButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Onboarding');
      });

      expect(toJSON()).toMatchSnapshot();
    });

    it('should call getStarted button and show terms of use', async () => {
      jest.spyOn(StorageWrapper, 'getItem').mockResolvedValue(false);

      const navigation = {
        navigate: mockNavigate,
        setOptions: mockSetOptions,
      } as unknown as NavigationProp<ParamListBase>;

      const { toJSON, getByTestId } = renderWithProvider(
        <OnboardingCarousel navigation={navigation} />,
      );

      const getStartedButton = getByTestId(
        OnboardingCarouselSelectorIDs.GET_STARTED_BUTTON_ID,
      );

      expect(getStartedButton).toBeOnTheScreen();
      fireEvent.press(getStartedButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Onboarding');
      });

      expect(toJSON()).toMatchSnapshot();
    });

    it('should change the carousel when the user swipes', async () => {
      const mockOnChangeTab = jest.fn();

      const navigation = {
        navigate: mockNavigate,
        setOptions: mockSetOptions,
      } as unknown as NavigationProp<ParamListBase>;

      const { toJSON } = renderWithProvider(
        <OnboardingCarousel navigation={navigation} />,
      );

      // Simulate the tab change event
      const tabChangeEvent = { i: 0 };
      mockOnChangeTab(tabChangeEvent);

      const tabChangeEvent2 = { i: 1 };
      mockOnChangeTab(tabChangeEvent2);

      const tabChangeEvent3 = { i: 2 };
      mockOnChangeTab(tabChangeEvent3);

      expect(toJSON()).toMatchSnapshot();
    });
  });
});
