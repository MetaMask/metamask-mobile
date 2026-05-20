import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import { DEFAULT_PREDICT_WORLD_CUP_FLAG } from '../../constants/flags';
import PredictWorldCupMainFeedBanner, {
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

  it('uses the remote banner image URL when configured', () => {
    const bannerImageUrl = 'https://example.com/world-cup-banner.png';
    mockUseSelector.mockReturnValue({
      ...enabledConfig,
      bannerImageUrl,
    });

    const { getByTestId } = render(<PredictWorldCupMainFeedBanner />);
    const image = getByTestId(PredictWorldCupMainFeedBannerSelectorsIDs.IMAGE);

    expect(image.props.source).toStrictEqual({ uri: bannerImageUrl });
    expect(StyleSheet.flatten(image.props.style).height).toBeGreaterThan(0);
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

  it('navigates to the World Cup screen when pressed', () => {
    const { getByTestId } = render(<PredictWorldCupMainFeedBanner />);

    fireEvent.press(
      getByTestId(PredictWorldCupMainFeedBannerSelectorsIDs.CONTAINER),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.WORLD_CUP,
    });
  });
});

describe('getPredictWorldCupBannerSource', () => {
  it('returns a trimmed remote URI source before the fallback image source', () => {
    expect(
      getPredictWorldCupBannerSource(' https://example.com/banner.png ', 1),
    ).toStrictEqual({ uri: 'https://example.com/banner.png' });
  });

  it('returns the fallback image source when remote URL is missing', () => {
    expect(getPredictWorldCupBannerSource(undefined, 1)).toBe(1);
  });

  it('returns undefined when remote URL and fallback are both missing', () => {
    expect(getPredictWorldCupBannerSource()).toBeUndefined();
  });
});
