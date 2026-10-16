import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type { UseMyProfileResult } from '../../MyProfileView/hooks/useMyProfile';
import { ManageProfileEditorSelectorsIDs } from '../ManageProfileView.testIds';
import type { ManageProfileTextEditorField } from './manageProfileTextEditorFields';
import ManageProfileTextEditorView from './ManageProfileTextEditorView';
import type { UseProfileControllerResult } from '../hooks/useProfileController';

const mockGoBack = jest.fn();
const mockUseRoute = jest.fn<
  { params: { field: ManageProfileTextEditorField } },
  []
>();
const mockUseMyProfile = jest.fn<UseMyProfileResult, []>();
const mockUseProfileController = jest.fn<UseProfileControllerResult, []>();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => mockUseRoute(),
}));

jest.mock('../../MyProfileView/hooks/useMyProfile', () => ({
  useMyProfile: () => mockUseMyProfile(),
}));

jest.mock('../hooks/useProfileController', () => ({
  useProfileController: () => mockUseProfileController(),
}));

describe('ManageProfileTextEditorView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMyProfile.mockReturnValue({
      profile: {
        profileId: 'current-user',
        displayName: 'Giga Whale',
        handle: 'giga-whale.metamask',
        shareUrl: 'https://metamask.io/social/giga-whale',
      },
      isLoading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    mockUseProfileController.mockReturnValue({
      isControllerBacked: false,
      profile: undefined,
      linkedAddresses: [],
      updateProfile: jest.fn().mockResolvedValue(undefined),
      checkUsernameAvailability: jest.fn().mockResolvedValue({
        username: 'giga-whale',
        available: true,
        valid: true,
        normalized: 'giga-whale',
        errors: [],
      }),
    });
  });

  it('keeps Save disabled after the display name field is edited', () => {
    mockUseRoute.mockReturnValue({ params: { field: 'displayName' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    fireEvent.changeText(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.DISPLAY_NAME_INPUT),
      'Laser Gains',
    );

    expect(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.DISPLAY_NAME_SAVE),
    ).toBeDisabled();
  });

  it('shows handle helper copy for the handle field', () => {
    mockUseRoute.mockReturnValue({ params: { field: 'handle' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    expect(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.HANDLE_INPUT),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('social_leaderboard.manage_profile.handle_helper'),
      ),
    ).toBeOnTheScreen();
  });

  it('updates the display name for a controller-backed profile', async () => {
    const updateProfile = jest.fn().mockResolvedValue(undefined);
    mockUseProfileController.mockReturnValue({
      isControllerBacked: true,
      profile: undefined,
      linkedAddresses: [],
      updateProfile,
      checkUsernameAvailability: jest.fn(),
    });
    mockUseRoute.mockReturnValue({ params: { field: 'displayName' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    fireEvent.changeText(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.DISPLAY_NAME_INPUT),
      'Laser Gains',
    );

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.DISPLAY_NAME_SAVE),
      );
    });

    expect(updateProfile).toHaveBeenCalledWith({
      display_name: 'Laser Gains',
    });
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('checks username availability before updating the handle', async () => {
    const updateProfile = jest.fn().mockResolvedValue(undefined);
    const checkUsernameAvailability = jest.fn().mockResolvedValue({
      username: 'laser-gains',
      available: true,
      valid: true,
      normalized: 'laser-gains',
      errors: [],
    });
    mockUseProfileController.mockReturnValue({
      isControllerBacked: true,
      profile: undefined,
      linkedAddresses: [],
      updateProfile,
      checkUsernameAvailability,
    });
    mockUseRoute.mockReturnValue({ params: { field: 'handle' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    fireEvent.changeText(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.HANDLE_INPUT),
      'laser-gains',
    );

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.HANDLE_SAVE),
      );
    });

    expect(checkUsernameAvailability).toHaveBeenCalledWith('laser-gains');
    expect(updateProfile).toHaveBeenCalledWith({ username: 'laser-gains' });
  });

  it('does not update the handle when the username is unavailable', async () => {
    const updateProfile = jest.fn().mockResolvedValue(undefined);
    const checkUsernameAvailability = jest.fn().mockResolvedValue({
      username: 'laser-gains',
      available: false,
      valid: true,
      normalized: 'laser-gains',
      errors: ['already_taken'],
    });
    mockUseProfileController.mockReturnValue({
      isControllerBacked: true,
      profile: undefined,
      linkedAddresses: [],
      updateProfile,
      checkUsernameAvailability,
    });
    mockUseRoute.mockReturnValue({ params: { field: 'handle' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    fireEvent.changeText(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.HANDLE_INPUT),
      'laser-gains',
    );

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.HANDLE_SAVE),
      );
    });

    expect(updateProfile).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        strings('social_leaderboard.manage_profile.username_unavailable'),
      ),
    ).toBeOnTheScreen();
  });
});
