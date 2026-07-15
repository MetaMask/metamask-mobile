import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { selectCanSignTransactions } from '../../../../../selectors/accountsController';
import { selectIsSwapsEnabled } from '../../../../../core/redux/slices/bridge';
import { selectBatchSellEnabled } from '../../../../../selectors/featureFlagController/batchSell';
import { selectSocialLeaderboardEnabled } from '../../../../../selectors/featureFlagController/socialLeaderboard';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps';
import { selectIsFirstTimePerpsUser } from '../../../../UI/Perps/selectors/perpsController';
import { selectPredictEnabledFlag } from '../../../../UI/Predict/selectors/featureFlags';
import {
  ActionButtonType,
  ActionLocation,
  ActionPosition,
} from '../../../../../util/analytics/actionButtonTracking';
import { HomepageActionButtonsGridTestIds } from './HomepageActionButtonsGrid.testIds';

const mockTrackActionButtonClick = jest.fn();
const mockGoToBuy = jest.fn();
const mockGoToSell = jest.fn();
const mockGoToSwaps = jest.fn();
const mockNavigate = jest.fn();
const mockOnSend = jest.fn();
const mockNavigateToSocialLeaderboard = jest.fn();

jest.mock('../../../../../util/analytics/actionButtonTracking', () => {
  const actual = jest.requireActual(
    '../../../../../util/analytics/actionButtonTracking',
  );
  return {
    ...actual,
    trackActionButtonClick: (...args: unknown[]) =>
      mockTrackActionButtonClick(...args),
  };
});

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(),
    })),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({
    goToBuy: mockGoToBuy,
    goToSell: mockGoToSell,
  }),
}));

jest.mock('../../../../UI/Bridge/hooks/useSwapBridgeNavigation', () => ({
  SwapBridgeNavigationLocation: { MainView: 'MainView' },
  useSwapBridgeNavigation: () => ({
    goToSwaps: mockGoToSwaps,
  }),
}));

jest.mock(
  '../../../SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation',
  () => ({
    navigateToSocialLeaderboard: (...args: unknown[]) =>
      mockNavigateToSocialLeaderboard(...args),
  }),
);

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

import HomepageActionButtonsGrid from './HomepageActionButtonsGrid';

const mockSelectorState = () => {
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectCanSignTransactions) {
      return true;
    }
    if (selector === selectIsSwapsEnabled) {
      return true;
    }
    if (selector === selectBatchSellEnabled) {
      return true;
    }
    if (selector === selectSocialLeaderboardEnabled) {
      return true;
    }
    if (selector === selectPerpsEnabledFlag) {
      return true;
    }
    if (selector === selectIsFirstTimePerpsUser) {
      return false;
    }
    if (selector === selectPredictEnabledFlag) {
      return true;
    }
    // selectIsSwapsEnabled is often called as (state) => select...(state)
    if (typeof selector === 'function') {
      try {
        return selector({});
      } catch {
        return true;
      }
    }
    return true;
  });
};

describe('HomepageActionButtonsGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectorState();
  });

  it('renders all eight buttons for row1Top order', () => {
    const { getByTestId } = render(
      <HomepageActionButtonsGrid onSend={mockOnSend} rowOrder="row1Top" />,
    );

    expect(
      getByTestId(HomepageActionButtonsGridTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(HomepageActionButtonsGridTestIds.BUY_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(HomepageActionButtonsGridTestIds.SELL_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(HomepageActionButtonsGridTestIds.SWAP_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(HomepageActionButtonsGridTestIds.SEND_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(HomepageActionButtonsGridTestIds.PERPS_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(HomepageActionButtonsGridTestIds.PREDICT_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(HomepageActionButtonsGridTestIds.BATCH_SWAP_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(HomepageActionButtonsGridTestIds.TRADERS_BUTTON),
    ).toBeOnTheScreen();
  });

  it('tracks sell tap with second position for row1Top', () => {
    const { getByTestId } = render(
      <HomepageActionButtonsGrid onSend={mockOnSend} rowOrder="row1Top" />,
    );

    fireEvent.press(getByTestId(HomepageActionButtonsGridTestIds.SELL_BUTTON));

    expect(mockTrackActionButtonClick).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        action_name: ActionButtonType.SELL,
        action_position: ActionPosition.SECOND_POSITION,
        location: ActionLocation.HOME,
      }),
    );
    expect(mockGoToSell).toHaveBeenCalledTimes(1);
  });

  it('tracks sell tap with sixth position for row2Top', () => {
    const { getByTestId } = render(
      <HomepageActionButtonsGrid onSend={mockOnSend} rowOrder="row2Top" />,
    );

    fireEvent.press(getByTestId(HomepageActionButtonsGridTestIds.SELL_BUTTON));

    expect(mockTrackActionButtonClick).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        action_name: ActionButtonType.SELL,
        action_position: ActionPosition.SIXTH_POSITION,
        location: ActionLocation.HOME,
      }),
    );
  });

  it('calls onSend when send is pressed', () => {
    const { getByTestId } = render(
      <HomepageActionButtonsGrid onSend={mockOnSend} rowOrder="row1Top" />,
    );

    fireEvent.press(getByTestId(HomepageActionButtonsGridTestIds.SEND_BUTTON));

    expect(mockOnSend).toHaveBeenCalledTimes(1);
    expect(mockTrackActionButtonClick).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        action_name: ActionButtonType.SEND,
        action_position: ActionPosition.FOURTH_POSITION,
      }),
    );
  });
});
