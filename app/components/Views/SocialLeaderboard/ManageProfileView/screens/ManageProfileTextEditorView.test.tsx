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
      createProfile: jest.fn().mockResolvedValue(undefined),
      fetchAndUpdateProfile: jest.fn(),
      fetchAndUpdateXAccount: jest.fn(),
      disconnectX: jest.fn(),
      getXAuthorizationUrl: jest.fn(),
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
      createProfile: jest.fn().mockResolvedValue(undefined),
      fetchAndUpdateProfile: jest.fn(),
      fetchAndUpdateXAccount: jest.fn(),
      disconnectX: jest.fn(),
      getXAuthorizationUrl: jest.fn(),
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
      username: 'laser_gains',
      available: true,
      valid: true,
      normalized: 'laser_gains',
      errors: [],
    });
    mockUseProfileController.mockReturnValue({
      isControllerBacked: true,
      profile: undefined,
      linkedAddresses: [],
      updateProfile,
      createProfile: jest.fn().mockResolvedValue(undefined),
      fetchAndUpdateProfile: jest.fn(),
      fetchAndUpdateXAccount: jest.fn(),
      disconnectX: jest.fn(),
      getXAuthorizationUrl: jest.fn(),
      checkUsernameAvailability,
    });
    mockUseRoute.mockReturnValue({ params: { field: 'handle' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    fireEvent.changeText(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.HANDLE_INPUT),
      'laser_gains',
    );

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.HANDLE_SAVE),
      );
    });

    expect(checkUsernameAvailability).toHaveBeenCalledWith('laser_gains');
    expect(updateProfile).toHaveBeenCalledWith({ username: 'laser_gains' });
  });

  it('does not update the handle when the username is unavailable', async () => {
    const updateProfile = jest.fn().mockResolvedValue(undefined);
    const checkUsernameAvailability = jest.fn().mockResolvedValue({
      username: 'laser_gains',
      available: false,
      valid: true,
      normalized: 'laser_gains',
      errors: [{ code: 'TAKEN', message: 'Already taken' }],
    });
    mockUseProfileController.mockReturnValue({
      isControllerBacked: true,
      profile: undefined,
      linkedAddresses: [],
      updateProfile,
      createProfile: jest.fn().mockResolvedValue(undefined),
      fetchAndUpdateProfile: jest.fn(),
      fetchAndUpdateXAccount: jest.fn(),
      disconnectX: jest.fn(),
      getXAuthorizationUrl: jest.fn(),
      checkUsernameAvailability,
    });
    mockUseRoute.mockReturnValue({ params: { field: 'handle' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    fireEvent.changeText(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.HANDLE_INPUT),
      'laser_gains',
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

  it('shows the character rule when the server rejects the format', async () => {
    const updateProfile = jest.fn().mockResolvedValue(undefined);
    const checkUsernameAvailability = jest.fn().mockResolvedValue({
      username: 'laser_gains',
      available: false,
      valid: false,
      normalized: 'laser_gains',
      errors: [{ code: 'INVALID_FORMAT', message: 'Bad format' }],
    });
    mockUseProfileController.mockReturnValue({
      isControllerBacked: true,
      profile: undefined,
      linkedAddresses: [],
      updateProfile,
      createProfile: jest.fn().mockResolvedValue(undefined),
      fetchAndUpdateProfile: jest.fn(),
      fetchAndUpdateXAccount: jest.fn(),
      disconnectX: jest.fn(),
      getXAuthorizationUrl: jest.fn(),
      checkUsernameAvailability,
    });
    mockUseRoute.mockReturnValue({ params: { field: 'handle' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    fireEvent.changeText(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.HANDLE_INPUT),
      'laser_gains',
    );

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.HANDLE_SAVE),
      );
    });

    expect(updateProfile).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        strings('social_leaderboard.manage_profile.username_invalid'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings('social_leaderboard.manage_profile.username_unavailable'),
      ),
    ).not.toBeOnTheScreen();
  });

  it('shows the maximum length rule without asking the server for a long handle', async () => {
    const updateProfile = jest.fn().mockResolvedValue(undefined);
    const checkUsernameAvailability = jest.fn();
    mockUseProfileController.mockReturnValue({
      isControllerBacked: true,
      profile: undefined,
      linkedAddresses: [],
      updateProfile,
      createProfile: jest.fn().mockResolvedValue(undefined),
      fetchAndUpdateProfile: jest.fn(),
      fetchAndUpdateXAccount: jest.fn(),
      disconnectX: jest.fn(),
      getXAuthorizationUrl: jest.fn(),
      checkUsernameAvailability,
    });
    mockUseRoute.mockReturnValue({ params: { field: 'handle' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    fireEvent.changeText(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.HANDLE_INPUT),
      'abcdefghijklmnopq',
    );

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.HANDLE_SAVE),
      );
    });

    expect(checkUsernameAvailability).not.toHaveBeenCalled();
    expect(updateProfile).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        strings('social_leaderboard.manage_profile.username_too_long', {
          max: 16,
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings('social_leaderboard.manage_profile.username_invalid'),
      ),
    ).not.toBeOnTheScreen();
  });

  it('shows the length rule without asking the server for a short handle', async () => {
    const updateProfile = jest.fn().mockResolvedValue(undefined);
    const checkUsernameAvailability = jest.fn();
    mockUseProfileController.mockReturnValue({
      isControllerBacked: true,
      profile: undefined,
      linkedAddresses: [],
      updateProfile,
      createProfile: jest.fn().mockResolvedValue(undefined),
      fetchAndUpdateProfile: jest.fn(),
      fetchAndUpdateXAccount: jest.fn(),
      disconnectX: jest.fn(),
      getXAuthorizationUrl: jest.fn(),
      checkUsernameAvailability,
    });
    mockUseRoute.mockReturnValue({ params: { field: 'handle' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    fireEvent.changeText(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.HANDLE_INPUT),
      'ab',
    );

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.HANDLE_SAVE),
      );
    });

    expect(checkUsernameAvailability).not.toHaveBeenCalled();
    expect(updateProfile).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        strings('social_leaderboard.manage_profile.username_too_short', {
          min: 3,
        }),
      ),
    ).toBeOnTheScreen();
  });
});
