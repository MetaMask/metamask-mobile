import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { selectCanSignTransactions } from '../../../../../selectors/accountsController';
import { selectIsSwapsEnabled } from '../../../../../core/redux/slices/bridge';
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
const mockOnReceive = jest.fn();
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

interface SelectorOverrides {
  canSignTransactions?: boolean;
  isSwapsEnabled?: boolean;
  isSocialLeaderboardEnabled?: boolean;
  isPerpsEnabled?: boolean;
  isPredictEnabled?: boolean;
  isFirstTimePerpsUser?: boolean;
}

const mockSelectorState = (overrides: SelectorOverrides = {}) => {
  const {
    canSignTransactions = true,
    isSwapsEnabled = true,
    isSocialLeaderboardEnabled = true,
    isPerpsEnabled = true,
    isPredictEnabled = true,
    isFirstTimePerpsUser = false,
  } = overrides;

  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectCanSignTransactions) {
      return canSignTransactions;
    }
    if (selector === selectIsSwapsEnabled) {
      return isSwapsEnabled;
    }
    if (selector === selectSocialLeaderboardEnabled) {
      return isSocialLeaderboardEnabled;
    }
    if (selector === selectPerpsEnabledFlag) {
      return isPerpsEnabled;
    }
    if (selector === selectIsFirstTimePerpsUser) {
      return isFirstTimePerpsUser;
    }
    if (selector === selectPredictEnabledFlag) {
      return isPredictEnabled;
    }
    // Swap wraps selectIsSwapsEnabled in an arrow selector.
    if (typeof selector === 'function') {
      return isSwapsEnabled;
    }
    return true;
  });
};

const ROW1_TOP_BUTTON_CASES = [
  {
    testId: HomepageActionButtonsGridTestIds.BUY_BUTTON,
    actionName: ActionButtonType.BUY,
    actionPosition: ActionPosition.FIRST_POSITION,
  },
  {
    testId: HomepageActionButtonsGridTestIds.SELL_BUTTON,
    actionName: ActionButtonType.SELL,
    actionPosition: ActionPosition.SECOND_POSITION,
  },
  {
    testId: HomepageActionButtonsGridTestIds.SEND_BUTTON,
    actionName: ActionButtonType.SEND,
    actionPosition: ActionPosition.THIRD_POSITION,
  },
  {
    testId: HomepageActionButtonsGridTestIds.RECEIVE_BUTTON,
    actionName: ActionButtonType.RECEIVE,
    actionPosition: ActionPosition.FOURTH_POSITION,
  },
  {
    testId: HomepageActionButtonsGridTestIds.SWAP_BUTTON,
    actionName: ActionButtonType.SWAP,
    actionPosition: ActionPosition.FIFTH_POSITION,
  },
  {
    testId: HomepageActionButtonsGridTestIds.PERPS_BUTTON,
    actionName: ActionButtonType.PERPS,
    actionPosition: ActionPosition.SIXTH_POSITION,
  },
  {
    testId: HomepageActionButtonsGridTestIds.PREDICT_BUTTON,
    actionName: ActionButtonType.PREDICT,
    actionPosition: ActionPosition.SEVENTH_POSITION,
  },
  {
    testId: HomepageActionButtonsGridTestIds.TRADERS_BUTTON,
    actionName: ActionButtonType.TRADERS,
    actionPosition: ActionPosition.EIGHTH_POSITION,
  },
] as const;

describe('HomepageActionButtonsGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectorState();
  });

  it('renders all eight buttons for row1Top order', () => {
    const { getByTestId } = render(
      <HomepageActionButtonsGrid
          onSend={mockOnSend}
          onReceive={mockOnReceive}
          rowOrder="row1Top"
        />,
    );

    expect(
      getByTestId(HomepageActionButtonsGridTestIds.CONTAINER),
    ).toBeOnTheScreen();
    ROW1_TOP_BUTTON_CASES.forEach(({ testId }) => {
      expect(getByTestId(testId)).toBeOnTheScreen();
    });
  });

  it.each(ROW1_TOP_BUTTON_CASES)(
    'tracks $actionName tap with position $actionPosition for row1Top',
    ({ testId, actionName, actionPosition }) => {
      const { getByTestId } = render(
        <HomepageActionButtonsGrid
          onSend={mockOnSend}
          onReceive={mockOnReceive}
          rowOrder="row1Top"
        />,
      );

      fireEvent.press(getByTestId(testId));

      expect(mockTrackActionButtonClick).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          action_name: actionName,
          action_position: actionPosition,
          location: ActionLocation.HOME,
        }),
      );
    },
  );

  it('tracks sell tap with sixth position for row2Top', () => {
    const { getByTestId } = render(
      <HomepageActionButtonsGrid
          onSend={mockOnSend}
          onReceive={mockOnReceive}
          rowOrder="row2Top"
        />,
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
      <HomepageActionButtonsGrid
          onSend={mockOnSend}
          onReceive={mockOnReceive}
          rowOrder="row1Top"
        />,
    );

    fireEvent.press(getByTestId(HomepageActionButtonsGridTestIds.SEND_BUTTON));

    expect(mockOnSend).toHaveBeenCalledTimes(1);
  });

  it('calls onReceive when receive is pressed', () => {
    const { getByTestId } = render(
      <HomepageActionButtonsGrid
        onSend={mockOnSend}
        onReceive={mockOnReceive}
        rowOrder="row1Top"
      />,
    );

    fireEvent.press(
      getByTestId(HomepageActionButtonsGridTestIds.RECEIVE_BUTTON),
    );

    expect(mockOnReceive).toHaveBeenCalledTimes(1);
  });

  describe('grey-out when product flags are off', () => {
    it('disables buy and sell when account cannot sign', () => {
      mockSelectorState({ canSignTransactions: false });

      const { getByTestId } = render(
        <HomepageActionButtonsGrid
          onSend={mockOnSend}
          onReceive={mockOnReceive}
          rowOrder="row1Top"
        />,
      );

      expect(
        getByTestId(HomepageActionButtonsGridTestIds.BUY_BUTTON).props
          .accessibilityState,
      ).toMatchObject({ disabled: true });
      expect(
        getByTestId(HomepageActionButtonsGridTestIds.SELL_BUTTON).props
          .accessibilityState,
      ).toMatchObject({ disabled: true });
      expect(
        getByTestId(HomepageActionButtonsGridTestIds.SEND_BUTTON).props
          .accessibilityState,
      ).toMatchObject({ disabled: true });
      // Receive needs no signing capability and stays enabled.
      expect(
        getByTestId(HomepageActionButtonsGridTestIds.RECEIVE_BUTTON).props
          .accessibilityState,
      ).toMatchObject({ disabled: false });
    });

    it('disables swap when swaps are disabled', () => {
      mockSelectorState({ isSwapsEnabled: false });

      const { getByTestId } = render(
        <HomepageActionButtonsGrid
          onSend={mockOnSend}
          onReceive={mockOnReceive}
          rowOrder="row1Top"
        />,
      );

      expect(
        getByTestId(HomepageActionButtonsGridTestIds.SWAP_BUTTON).props
          .accessibilityState,
      ).toMatchObject({ disabled: true });
    });

    it('disables perps when perps flag is off', () => {
      mockSelectorState({ isPerpsEnabled: false });

      const { getByTestId } = render(
        <HomepageActionButtonsGrid
          onSend={mockOnSend}
          onReceive={mockOnReceive}
          rowOrder="row1Top"
        />,
      );

      expect(
        getByTestId(HomepageActionButtonsGridTestIds.PERPS_BUTTON).props
          .accessibilityState,
      ).toMatchObject({ disabled: true });
    });

    it('disables predict when predict flag is off', () => {
      mockSelectorState({ isPredictEnabled: false });

      const { getByTestId } = render(
        <HomepageActionButtonsGrid
          onSend={mockOnSend}
          onReceive={mockOnReceive}
          rowOrder="row1Top"
        />,
      );

      expect(
        getByTestId(HomepageActionButtonsGridTestIds.PREDICT_BUTTON).props
          .accessibilityState,
      ).toMatchObject({ disabled: true });
    });

    it('disables traders when social leaderboard flag is off', () => {
      mockSelectorState({ isSocialLeaderboardEnabled: false });

      const { getByTestId } = render(
        <HomepageActionButtonsGrid
          onSend={mockOnSend}
          onReceive={mockOnReceive}
          rowOrder="row1Top"
        />,
      );

      expect(
        getByTestId(HomepageActionButtonsGridTestIds.TRADERS_BUTTON).props
          .accessibilityState,
      ).toMatchObject({ disabled: true });
    });

    it('does not track or navigate when a disabled button is pressed', () => {
      mockSelectorState({ isPerpsEnabled: false });

      const { getByTestId } = render(
        <HomepageActionButtonsGrid
          onSend={mockOnSend}
          onReceive={mockOnReceive}
          rowOrder="row1Top"
        />,
      );

      fireEvent.press(
        getByTestId(HomepageActionButtonsGridTestIds.PERPS_BUTTON),
      );

      expect(mockTrackActionButtonClick).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
