import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { PredictEventValues } from '../../constants/eventNames';
import PredictWorldCupHubBanner from './PredictWorldCupHubBanner';
import { PredictWorldCupHubBannerSelectorsIDs } from './PredictWorldCupHubBanner.testIds';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;
const mockTrackBannerAction = jest.fn();
const mockHandleRewardsUrl = jest.fn();

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

jest.mock(
  '../../../../../core/DeeplinkManager/handlers/legacy/handleRewardsUrl',
  () => ({
    handleRewardsUrl: (...args: Parameters<typeof mockHandleRewardsUrl>) =>
      mockHandleRewardsUrl(...args),
  }),
);

describe('PredictWorldCupHubBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(true);
  });

  it('renders the banner image and container when enabled', () => {
    const { getByTestId } = render(<PredictWorldCupHubBanner />);

    expect(
      getByTestId(PredictWorldCupHubBannerSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PredictWorldCupHubBannerSelectorsIDs.IMAGE),
    ).toBeOnTheScreen();
  });

  it('does not render when the hub banner flag is disabled', () => {
    mockUseSelector.mockReturnValue(false);

    const { queryByTestId } = render(<PredictWorldCupHubBanner />);

    expect(
      queryByTestId(PredictWorldCupHubBannerSelectorsIDs.CONTAINER),
    ).toBeNull();
  });

  it('tracks banner viewed once per render lifecycle', () => {
    const { rerender } = render(<PredictWorldCupHubBanner />);

    expect(mockTrackBannerAction).toHaveBeenCalledTimes(1);
    expect(mockTrackBannerAction).toHaveBeenCalledWith({
      actionType: PredictEventValues.ACTION_TYPE.VIEWED,
      bannerType: PredictEventValues.BANNER_TYPE.PREDICT_THE_PITCH,
    });

    rerender(<PredictWorldCupHubBanner />);

    expect(mockTrackBannerAction).toHaveBeenCalledTimes(1);
  });

  it('does not track viewed when disabled', () => {
    mockUseSelector.mockReturnValue(false);

    render(<PredictWorldCupHubBanner />);

    expect(mockTrackBannerAction).not.toHaveBeenCalled();
  });

  it('tracks clicked and routes to the rewards deeplink when pressed', () => {
    const { getByTestId } = render(<PredictWorldCupHubBanner />);

    fireEvent.press(
      getByTestId(PredictWorldCupHubBannerSelectorsIDs.CONTAINER),
    );

    expect(mockTrackBannerAction).toHaveBeenCalledWith({
      actionType: PredictEventValues.ACTION_TYPE.CLICKED,
      bannerType: PredictEventValues.BANNER_TYPE.PREDICT_THE_PITCH,
    });
    expect(mockHandleRewardsUrl).toHaveBeenCalledWith({
      rewardsPath: '/rewards?campaign=predict-the-pitch',
    });
  });

  it('fires a single clicked event and navigation per tap (no double-fire)', () => {
    const { getByTestId } = render(<PredictWorldCupHubBanner />);

    fireEvent.press(
      getByTestId(PredictWorldCupHubBannerSelectorsIDs.CONTAINER),
    );

    const clickedCalls = mockTrackBannerAction.mock.calls.filter(
      ([args]) => args?.actionType === PredictEventValues.ACTION_TYPE.CLICKED,
    );
    expect(clickedCalls).toHaveLength(1);
    expect(mockHandleRewardsUrl).toHaveBeenCalledTimes(1);
  });

  it('hides the decorative arrow from the accessibility tree', () => {
    const { queryByTestId } = render(<PredictWorldCupHubBanner />);

    expect(
      queryByTestId(PredictWorldCupHubBannerSelectorsIDs.ARROW),
    ).toBeNull();
  });

  it('routes to the rewards deeplink when the arrow affordance is pressed', () => {
    const { getByTestId } = render(<PredictWorldCupHubBanner />);

    fireEvent.press(
      getByTestId(PredictWorldCupHubBannerSelectorsIDs.ARROW, {
        includeHiddenElements: true,
      }),
    );

    expect(mockTrackBannerAction).toHaveBeenCalledWith({
      actionType: PredictEventValues.ACTION_TYPE.CLICKED,
      bannerType: PredictEventValues.BANNER_TYPE.PREDICT_THE_PITCH,
    });
    expect(mockHandleRewardsUrl).toHaveBeenCalledWith({
      rewardsPath: '/rewards?campaign=predict-the-pitch',
    });
  });
});
