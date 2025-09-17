import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock dependencies
import RewardsClaimBottomSheetModal from './RewardsClaimBottomSheetModal';
import { SeasonRewardType } from '../../../../../../core/Engine/controllers/rewards-controller/types';

// Mock useClaimReward hook
const mockClaimReward = jest.fn();
const mockClearClaimRewardError = jest.fn();

// Create a mutable mock state
const mockUseClaimRewardState: {
  claimReward: jest.Mock;
  isClaimingReward: boolean;
  claimRewardError: string | undefined;
  clearClaimRewardError: jest.Mock;
} = {
  claimReward: mockClaimReward,
  isClaimingReward: false,
  claimRewardError: undefined,
  clearClaimRewardError: mockClearClaimRewardError,
};

jest.mock('../../../hooks/useClaimReward', () => ({
  __esModule: true,
  default: () => mockUseClaimRewardState,
}));

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

// Mock strings
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.upcoming_rewards.cta_label': 'Got it',
      'rewards.unlocked_rewards.cta_label': 'Claim Reward',
      'rewards.unlocked_rewards.cta_request_invite': 'Request Invite',
    };
    return translations[key] || key;
  }),
}));

// Mock RewardsBottomSheetModal
jest.mock('../../RewardsBottomSheetModal', () => {
  const React = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');

  return ({ route }: { route: { params: Record<string, unknown> } }) => {
    const { confirmAction, error } = route.params;
    const action = confirmAction as {
      label: string;
      onPress: () => void;
      disabled?: boolean;
    };

    return React.createElement(
      View,
      { testID: 'rewards-bottom-sheet-modal' },
      React.createElement(
        TouchableOpacity,
        {
          testID: 'confirm-button',
          onPress: () => action.onPress(),
          disabled: action.disabled,
        },
        React.createElement(Text, {}, action.label),
      ),
      error &&
        React.createElement(Text, { testID: 'error-message' }, error as string),
    );
  };
});

// Mock ButtonVariant
jest.mock('@metamask/design-system-react-native', () => ({
  ButtonVariant: {
    Primary: 'primary',
    Secondary: 'secondary',
  },
}));

const mockConfirmAction = {
  label: 'Test Action',
  onPress: jest.fn(),
};

interface TestRouteParams {
  title: string;
  description: string;
  confirmAction: { label: string; onPress: () => void };
  rewardId: string;
  rewardType: SeasonRewardType;
  isLocked: boolean;
}

const defaultRoute: { params: TestRouteParams } = {
  params: {
    title: 'Test Reward',
    description: 'Test Description',
    confirmAction: mockConfirmAction,
    rewardId: 'reward-123',
    rewardType: SeasonRewardType.GENERIC,
    isLocked: false,
  },
};

describe('RewardsClaimBottomSheetModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly with minimal required props', () => {
    expect(() =>
      render(<RewardsClaimBottomSheetModal route={defaultRoute} />),
    ).not.toThrow();
  });

  it('should render the underlying RewardsBottomSheetModal', () => {
    const { getByTestId } = render(
      <RewardsClaimBottomSheetModal route={defaultRoute} />,
    );

    expect(getByTestId('rewards-bottom-sheet-modal')).toBeOnTheScreen();
  });

  describe('Locked rewards', () => {
    it('should show "Got it" button for locked rewards', () => {
      const lockedRoute = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          isLocked: true,
        },
      };

      const { getByText } = render(
        <RewardsClaimBottomSheetModal route={lockedRoute} />,
      );

      expect(getByText('Got it')).toBeOnTheScreen();
    });

    it('should call navigation.goBack when "Got it" is pressed for locked rewards', () => {
      const lockedRoute = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          isLocked: true,
        },
      };

      const { getByTestId } = render(
        <RewardsClaimBottomSheetModal route={lockedRoute} />,
      );

      const confirmButton = getByTestId('confirm-button');
      fireEvent.press(confirmButton);

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('Generic reward type', () => {
    it('should show "Got it" button for generic rewards', () => {
      const genericRoute = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          rewardType: SeasonRewardType.GENERIC,
          isLocked: false,
        },
      };

      const { getByText } = render(
        <RewardsClaimBottomSheetModal route={genericRoute} />,
      );

      expect(getByText('Got it')).toBeOnTheScreen();
    });

    it('should call navigation.goBack when button is pressed for generic rewards', () => {
      const genericRoute = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          rewardType: SeasonRewardType.GENERIC,
          isLocked: false,
        },
      };

      const { getByTestId } = render(
        <RewardsClaimBottomSheetModal route={genericRoute} />,
      );

      const confirmButton = getByTestId('confirm-button');
      fireEvent.press(confirmButton);

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('Perps discount reward type', () => {
    it('should show "Got it" button for perps discount rewards', () => {
      const perpsRoute = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          rewardType: SeasonRewardType.PERPS_DISCOUNT,
          isLocked: false,
        },
      };

      const { getByText } = render(
        <RewardsClaimBottomSheetModal route={perpsRoute} />,
      );

      expect(getByText('Got it')).toBeOnTheScreen();
    });
  });

  describe('Points boost reward type', () => {
    it('should show "Claim Reward" button for points boost rewards', () => {
      const pointsBoostRoute = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          rewardType: SeasonRewardType.POINTS_BOOST,
          isLocked: false,
        },
      };

      const { getByText } = render(
        <RewardsClaimBottomSheetModal route={pointsBoostRoute} />,
      );

      expect(getByText('Claim Reward')).toBeOnTheScreen();
    });

    it('should call claimReward when button is pressed for points boost rewards', async () => {
      const pointsBoostRoute = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          rewardType: SeasonRewardType.POINTS_BOOST,
          isLocked: false,
        },
      };

      mockClaimReward.mockResolvedValue(undefined);

      const { getByTestId } = render(
        <RewardsClaimBottomSheetModal route={pointsBoostRoute} />,
      );

      const confirmButton = getByTestId('confirm-button');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockClaimReward).toHaveBeenCalledWith('reward-123', {});
      });
    });

    it('should close modal after successful claim for points boost rewards', async () => {
      const pointsBoostRoute = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          rewardType: SeasonRewardType.POINTS_BOOST,
          isLocked: false,
        },
      };

      mockClaimReward.mockResolvedValue(undefined);

      const { getByTestId } = render(
        <RewardsClaimBottomSheetModal route={pointsBoostRoute} />,
      );

      const confirmButton = getByTestId('confirm-button');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockGoBack).toHaveBeenCalled();
      });
    });
  });

  describe('Alpha Fox invite reward type', () => {
    it('should show "Request Invite" button for Alpha Fox invite rewards', () => {
      const alphaFoxRoute = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          rewardType: SeasonRewardType.ALPHA_FOX_INVITE,
          isLocked: false,
        },
      };

      const { getByText } = render(
        <RewardsClaimBottomSheetModal route={alphaFoxRoute} />,
      );

      expect(getByText('Request Invite')).toBeOnTheScreen();
    });

    it('should call claimReward for Alpha Fox invite rewards', async () => {
      const alphaFoxRoute = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          rewardType: SeasonRewardType.ALPHA_FOX_INVITE,
          isLocked: false,
        },
      };

      mockClaimReward.mockResolvedValue(undefined);

      const { getByTestId } = render(
        <RewardsClaimBottomSheetModal route={alphaFoxRoute} />,
      );

      const confirmButton = getByTestId('confirm-button');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockClaimReward).toHaveBeenCalledWith('reward-123', {});
      });
    });
  });

  describe('Loading states', () => {
    it('should disable button when claiming reward is in progress', () => {
      // Set loading state
      mockUseClaimRewardState.isClaimingReward = true;

      const pointsBoostRoute = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          rewardType: SeasonRewardType.POINTS_BOOST,
          isLocked: false,
        },
      };

      const { getByTestId } = render(
        <RewardsClaimBottomSheetModal route={pointsBoostRoute} />,
      );

      const confirmButton = getByTestId('confirm-button');
      expect(confirmButton.props.disabled).toBe(true);

      // Reset state
      mockUseClaimRewardState.isClaimingReward = false;
    });
  });

  describe('Error handling', () => {
    it('should display error message when claim fails', () => {
      // Set error state
      mockUseClaimRewardState.claimRewardError = 'Failed to claim reward';

      const { getByTestId } = render(
        <RewardsClaimBottomSheetModal route={defaultRoute} />,
      );

      expect(getByTestId('error-message')).toBeOnTheScreen();

      // Reset state
      mockUseClaimRewardState.claimRewardError = undefined;
    });

    it('should keep modal open when claim fails', async () => {
      const pointsBoostRoute = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          rewardType: SeasonRewardType.POINTS_BOOST,
          isLocked: false,
        },
      };

      mockClaimReward.mockRejectedValue(new Error('Claim failed'));

      const { getByTestId } = render(
        <RewardsClaimBottomSheetModal route={pointsBoostRoute} />,
      );

      const confirmButton = getByTestId('confirm-button');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockClaimReward).toHaveBeenCalled();
      });

      // Modal should remain open (goBack should not be called)
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('Default reward type', () => {
    it('should show "Got it" button for unknown reward types', () => {
      const unknownRoute = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          rewardType: 'UNKNOWN_TYPE' as SeasonRewardType,
          isLocked: false,
        },
      };

      const { getByText } = render(
        <RewardsClaimBottomSheetModal route={unknownRoute} />,
      );

      expect(getByText('Got it')).toBeOnTheScreen();
    });
  });

  describe('Route params passing', () => {
    it('should pass through all route params to RewardsBottomSheetModal', () => {
      const routeWithExtraParams = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          title: 'Custom Title',
          description: 'Custom Description',
          showIcon: true,
          showInput: false,
        },
      };

      expect(() =>
        render(<RewardsClaimBottomSheetModal route={routeWithExtraParams} />),
      ).not.toThrow();
    });

    it('should override confirmAction and error in route params', () => {
      const routeWithConflictingParams = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          confirmAction: {
            label: 'Original Action',
            onPress: jest.fn(),
          },
          error: 'Original Error',
        },
      };

      // The component should override these with its own values
      expect(() =>
        render(
          <RewardsClaimBottomSheetModal route={routeWithConflictingParams} />,
        ),
      ).not.toThrow();
    });
  });
});
