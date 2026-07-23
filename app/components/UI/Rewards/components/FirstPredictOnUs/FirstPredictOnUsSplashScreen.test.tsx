import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { ONBOARDING_SUCCESS_FLOW } from '../../../../../constants/onboarding';
import Routes from '../../../../../constants/navigation/Routes';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import type { FirstPredictOnUsDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import type { PredictMarket } from '../../../Predict/types';
import FirstPredictOnUsSplashScreen from './FirstPredictOnUsSplashScreen';

const mockReset = jest.fn();
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({ name: 'event' }));
const mockCreateEventBuilder = jest.fn(() => ({
  build: mockBuild,
}));

const content: FirstPredictOnUsDto = {
  name: 'First Predict On Us',
  image: {
    lightModeUrl: 'https://images.example.com/light.png',
    darkModeUrl: 'https://images.example.com/dark.png',
  } as never,
  localizedText: {
    'splashSheet.skip': 'Skip',
    'splashSheet.description':
      'Make a $5 prediction on select sports markets and keep what you win.',
    'splashSheet.region': 'Availability varies by region.',
    'splashSheet.termsApply': 'Terms apply.',
  },
  usdAmount: 5,
  markets: [{ eventId: '30615', conditionId: '0xabc' }],
  termsUrl: 'https://example.com/terms',
};

const markets = [{ id: '30615', outcomes: [] } as unknown as PredictMarket];

let mockRouteParams: {
  content: FirstPredictOnUsDto;
  markets: PredictMarket[];
  successFlow?: ONBOARDING_SUCCESS_FLOW;
} = { content, markets };

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      reset: mockReset,
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
  };
});

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock('../ThemeImageComponent/RewardsThemeImageComponent', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./FirstPredictOnUsMarketsCarousel', () => ({
  __esModule: true,
  default: () => null,
}));

const expectedSuccessReset = {
  index: 0,
  routes: [
    {
      name: Routes.ONBOARDING.SUCCESS_FLOW,
      params: {
        screen: Routes.ONBOARDING.SUCCESS,
        params: {
          successFlow: ONBOARDING_SUCCESS_FLOW.SEEDLESS_ONBOARDING,
        },
      },
    },
  ],
};

describe('FirstPredictOnUsSplashScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { content, markets };
    jest.mocked(useAnalytics).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as never);
  });

  it('renders resolved CMS splash copy from route params', () => {
    const { getByText } = render(<FirstPredictOnUsSplashScreen />);

    expect(
      getByText(content.localizedText['splashSheet.skip']),
    ).toBeOnTheScreen();
    expect(
      getByText(content.localizedText['splashSheet.description']),
    ).toBeOnTheScreen();
    expect(
      getByText(content.localizedText['splashSheet.region']),
    ).toBeOnTheScreen();
    expect(
      getByText(content.localizedText['splashSheet.termsApply']),
    ).toBeOnTheScreen();
  });

  it('tracks the viewed event on mount', () => {
    render(<FirstPredictOnUsSplashScreen />);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.FIRST_PREDICTION_ON_US_VIEWED,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'event' });
  });

  it('tracks skip and resets to OnboardingSuccess', () => {
    const { getByTestId } = render(<FirstPredictOnUsSplashScreen />);

    fireEvent.press(getByTestId('first-predict-on-us-splash-skip'));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.FIRST_PREDICTION_ON_US_SKIPPED,
    );
    expect(mockReset).toHaveBeenCalledWith(expectedSuccessReset);
  });

  it('uses the successFlow route param when resetting to OnboardingSuccess', () => {
    mockRouteParams = {
      content,
      markets,
      successFlow: ONBOARDING_SUCCESS_FLOW.SEEDLESS_ONBOARDING,
    };

    const { getByTestId } = render(<FirstPredictOnUsSplashScreen />);

    fireEvent.press(getByTestId('first-predict-on-us-splash-skip'));

    expect(mockReset).toHaveBeenCalledWith(expectedSuccessReset);
  });
});
