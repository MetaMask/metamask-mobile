import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import { DEFAULT_PREDICT_WORLD_CUP_FLAG } from '../../constants/flags';
import { PredictEventValues } from '../../constants/eventNames';
import PredictWorldCupMainFeedBanner, {
  getPredictWorldCupBannerImageAspectRatio,
  getPredictWorldCupBannerSource,
} from './PredictWorldCupMainFeedBanner';
import { PredictWorldCupMainFeedBannerSelectorsIDs } from './PredictWorldCupMainFeedBanner.testIds';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('react-native', () => {
  const actualReactNative = jest.requireActual('react-native');
  return {
    ...actualReactNative,
    useWindowDimensions: jest.fn(() => ({
      width: 393,
      height: 852,
      scale: 3,
      fontScale: 1,
    })),
  };
});

const mockUseNavigation = useNavigation as jest.Mock;
const mockUseSelector = useSelector as jest.Mock;
const mockNavigate = jest.fn();
const mockTrackBannerAction = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PredictController: {
        trackBannerAction: (
          ...args: Parameters<typeof mockTrackBannerAction>
        ) => mockTrackBannerAction(...args),
      },
    },
  },
}));

const enabledConfig = {
  ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
  enabled: true,
  showMainFeedBanner: true,
  showWorldCupScreen: true,
};

describe('PredictWorldCupMainFeedBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({ navigate: mockNavigate });
    mockUseSelector.mockReturnValue(enabledConfig);
  });

  it('renders when the banner and World Cup screen are enabled and fallback image exists', () => {
    const { getByTestId } = render(<PredictWorldCupMainFeedBanner />);

    expect(
      getByTestId(PredictWorldCupMainFeedBannerSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PredictWorldCupMainFeedBannerSelectorsIDs.IMAGE),
    ).toBeOnTheScreen();
  });

  it('uses the remote banner image URL and configured dimensions when configured', () => {
    const bannerImageUrl = 'https://example.com/world-cup-banner.png';
    mockUseSelector.mockReturnValue({
      ...enabledConfig,
      bannerImage: {
        url: bannerImageUrl,
        width: 400,
        height: 200,
      },
    });

    const { getByTestId } = render(<PredictWorldCupMainFeedBanner />);
    const image = getByTestId(PredictWorldCupMainFeedBannerSelectorsIDs.IMAGE);

    expect(image.props.source).toStrictEqual({ uri: bannerImageUrl });
    expect(StyleSheet.flatten(image.props.style).height).toBe(359);
  });

  it('does not render when the main feed banner is disabled', () => {
    mockUseSelector.mockReturnValue({
      ...enabledConfig,
      showMainFeedBanner: false,
    });

    const { queryByTestId } = render(<PredictWorldCupMainFeedBanner />);

    expect(
      queryByTestId(PredictWorldCupMainFeedBannerSelectorsIDs.CONTAINER),
    ).toBeNull();
  });

  it('does not render when the World Cup screen is disabled', () => {
    mockUseSelector.mockReturnValue({
      ...enabledConfig,
      showWorldCupScreen: false,
    });

    const { queryByTestId } = render(<PredictWorldCupMainFeedBanner />);

    expect(
      queryByTestId(PredictWorldCupMainFeedBannerSelectorsIDs.CONTAINER),
    ).toBeNull();
  });

  it('does not render when there is no remote image URL or fallback image', () => {
    const { queryByTestId } = render(
      <PredictWorldCupMainFeedBanner fallbackImageSource={null} />,
    );

    expect(
      queryByTestId(PredictWorldCupMainFeedBannerSelectorsIDs.CONTAINER),
    ).toBeNull();
  });

  it('tracks banner viewed once per render lifecycle', () => {
    const { rerender } = render(<PredictWorldCupMainFeedBanner />);

    expect(mockTrackBannerAction).toHaveBeenCalledTimes(1);
    expect(mockTrackBannerAction).toHaveBeenCalledWith({
      actionType: PredictEventValues.ACTION_TYPE.VIEWED,
      bannerType: PredictEventValues.BANNER_TYPE.WORLD_CUP,
    });

    rerender(<PredictWorldCupMainFeedBanner />);

    expect(mockTrackBannerAction).toHaveBeenCalledTimes(1);
  });

  it('navigates to the World Cup screen when pressed', () => {
    const { getByTestId } = render(<PredictWorldCupMainFeedBanner />);

    fireEvent.press(
      getByTestId(PredictWorldCupMainFeedBannerSelectorsIDs.CONTAINER),
    );

    expect(mockTrackBannerAction).toHaveBeenCalledWith({
      actionType: PredictEventValues.ACTION_TYPE.CLICKED,
      bannerType: PredictEventValues.BANNER_TYPE.WORLD_CUP,
    });
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.WORLD_CUP,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
      },
    });
  });
});

describe('getPredictWorldCupBannerImageAspectRatio', () => {
  it('returns configured image aspect ratio when dimensions are provided', () => {
    expect(
      getPredictWorldCupBannerImageAspectRatio({
        url: 'https://example.com/banner.png',
        width: 400,
        height: 200,
      }),
    ).toBe(2);
  });

  it('returns default image aspect ratio when dimensions are missing', () => {
    expect(getPredictWorldCupBannerImageAspectRatio()).toBe(2);
  });

  it('returns default image aspect ratio when dimensions are invalid', () => {
    expect(
      getPredictWorldCupBannerImageAspectRatio({
        url: 'https://example.com/banner.png',
        width: 0,
        height: -200,
      }),
    ).toBe(2);
  });
});

describe('getPredictWorldCupBannerSource', () => {
  it('returns a trimmed remote URI source before the fallback image source', () => {
    expect(
      getPredictWorldCupBannerSource(
        { url: ' https://example.com/banner.png ', width: 400, height: 200 },
        1,
      ),
    ).toStrictEqual({ uri: 'https://example.com/banner.png' });
  });

  it('returns the fallback image source when remote URL is missing', () => {
    expect(getPredictWorldCupBannerSource(undefined, 1)).toBe(1);
  });

  it('returns undefined when remote URL and fallback are both missing', () => {
    expect(getPredictWorldCupBannerSource()).toBeUndefined();
  });
});
