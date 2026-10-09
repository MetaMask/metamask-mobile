import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { ManageProfileTradingActivitySelectorsIDs } from '../ManageProfileView.testIds';
import type { UseProfileControllerResult } from '../hooks/useProfileController';
import ManageProfileTradingActivityView from './ManageProfileTradingActivityView';

const mockGoBack = jest.fn();
const mockUseProfileController = jest.fn<UseProfileControllerResult, []>();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../hooks/useProfileController', () => ({
  useProfileController: () => mockUseProfileController(),
}));

describe('ManageProfileTradingActivityView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfileController.mockReturnValue({
      isControllerBacked: false,
      profile: undefined,
      linkedAddresses: [],
      updateProfile: jest.fn().mockResolvedValue(undefined),
      checkUsernameAvailability: jest.fn(),
    });
  });

  it('renders a display-only switch that stays on', () => {
    renderWithProvider(<ManageProfileTradingActivityView />);

    const activitySwitch = screen.getByTestId(
      ManageProfileTradingActivitySelectorsIDs.SWITCH,
    );

    fireEvent(activitySwitch, 'valueChange', false);

    expect(activitySwitch).toHaveProp('value', true);
    expect(activitySwitch).toHaveProp('accessibilityState', {
      disabled: true,
    });
  });

  it('does not navigate when the info icon is pressed', () => {
    renderWithProvider(<ManageProfileTradingActivityView />);

    fireEvent.press(
      screen.getByTestId(ManageProfileTradingActivitySelectorsIDs.INFO_BUTTON),
    );

    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('updates trading privacy for a controller-backed profile', async () => {
    const updateProfile = jest.fn().mockResolvedValue(undefined);
    mockUseProfileController.mockReturnValue({
      isControllerBacked: true,
      profile: {
        profileId: 'profile-123',
        username: 'alice',
        displayName: 'Alice',
        bio: '',
        linkedAddresses: [],
        avatarUrl: '',
        tradingPrivacy: 'public',
        connectedToX: false,
        createdAt: '',
        updatedAt: '',
      },
      linkedAddresses: [],
      updateProfile,
      checkUsernameAvailability: jest.fn(),
    });

    renderWithProvider(<ManageProfileTradingActivityView />);

    await act(async () => {
      fireEvent(
        screen.getByTestId(ManageProfileTradingActivitySelectorsIDs.SWITCH),
        'valueChange',
        false,
      );
    });

    expect(updateProfile).toHaveBeenCalledWith({
      trading_privacy: 'private',
    });
  });
});
