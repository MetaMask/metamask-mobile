import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type { UseMyProfileResult } from '../../MyProfileView/hooks/useMyProfile';
import { MAX_DISPLAY_NAME_LENGTH } from '../../ProfileOnboarding/profileOnboardingDraft';
import { ManageProfileEditorSelectorsIDs } from '../ManageProfileView.testIds';
import type { ManageProfileTextEditorField } from './manageProfileTextEditorFields';
import ManageProfileTextEditorView from './ManageProfileTextEditorView';
import type { UseProfileControllerResult } from '../hooks/useProfileController';

const controllerBackedProfile = (
  overrides: Partial<UseProfileControllerResult> = {},
): UseProfileControllerResult => ({
  isControllerBacked: true,
  profile: undefined,
  linkedAddresses: [],
  updateProfile: jest.fn().mockResolvedValue(undefined),
  createProfile: jest.fn().mockResolvedValue(undefined),
  fetchAndUpdateProfile: jest.fn(),
  fetchAndUpdateXAccount: jest.fn(),
  disconnectX: jest.fn(),
  getXAuthorizationUrl: jest.fn(),
  checkUsernameAvailability: jest.fn(),
  checkDisplayNameValidity: jest.fn().mockResolvedValue({ valid: true }),
  ...overrides,
});

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
      checkDisplayNameValidity: jest.fn().mockResolvedValue({ valid: true }),
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
    const checkDisplayNameValidity = jest
      .fn()
      .mockResolvedValue({ valid: true });
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
      checkDisplayNameValidity,
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

    expect(checkDisplayNameValidity).toHaveBeenCalledWith('Laser Gains');
    expect(updateProfile).toHaveBeenCalledWith({
      display_name: 'Laser Gains',
    });
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('does not save a display name the profile API rejects', async () => {
    const updateProfile = jest.fn().mockResolvedValue(undefined);
    const checkDisplayNameValidity = jest
      .fn()
      .mockResolvedValue({ valid: false });
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
      checkDisplayNameValidity,
    });
    mockUseRoute.mockReturnValue({ params: { field: 'displayName' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    fireEvent.changeText(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.DISPLAY_NAME_INPUT),
      'Bad Name',
    );

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.DISPLAY_NAME_SAVE),
      );
    });

    expect(checkDisplayNameValidity).toHaveBeenCalledWith('Bad Name');
    expect(updateProfile).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        strings('social_leaderboard.profile_onboarding.display_name_invalid'),
      ),
    ).toBeOnTheScreen();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('shows the length rule for a stored display name over 32 characters', async () => {
    const updateProfile = jest.fn().mockResolvedValue(undefined);
    const checkDisplayNameValidity = jest.fn();
    mockUseMyProfile.mockReturnValue({
      profile: {
        profileId: 'current-user',
        displayName: 'A'.repeat(MAX_DISPLAY_NAME_LENGTH + 1),
        handle: 'giga-whale.metamask',
      },
      isLoading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    mockUseProfileController.mockReturnValue(
      controllerBackedProfile({ updateProfile, checkDisplayNameValidity }),
    );
    mockUseRoute.mockReturnValue({ params: { field: 'displayName' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.DISPLAY_NAME_SAVE),
      );
    });

    expect(checkDisplayNameValidity).not.toHaveBeenCalled();
    expect(updateProfile).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        strings('social_leaderboard.manage_profile.display_name_too_long', {
          max: MAX_DISPLAY_NAME_LENGTH,
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings('social_leaderboard.profile_onboarding.display_name_invalid'),
      ),
    ).not.toBeOnTheScreen();
  });

  it('keeps the display name when the validity check cannot reach the API', async () => {
    const updateProfile = jest.fn().mockResolvedValue(undefined);
    const checkDisplayNameValidity = jest
      .fn()
      .mockRejectedValue(new Error('offline'));
    mockUseProfileController.mockReturnValue(
      controllerBackedProfile({ updateProfile, checkDisplayNameValidity }),
    );
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

    expect(checkDisplayNameValidity).toHaveBeenCalledWith('Laser Gains');
    expect(updateProfile).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        strings('social_leaderboard.manage_profile.display_name_check_error'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings('social_leaderboard.profile_onboarding.display_name_invalid'),
      ),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings('social_leaderboard.manage_profile.save_error'),
      ),
    ).not.toBeOnTheScreen();
  });

  it('trims surrounding spaces before checking and saving a display name', async () => {
    const updateProfile = jest.fn().mockResolvedValue(undefined);
    const checkDisplayNameValidity = jest
      .fn()
      .mockResolvedValue({ valid: true });
    mockUseProfileController.mockReturnValue(
      controllerBackedProfile({ updateProfile, checkDisplayNameValidity }),
    );
    mockUseRoute.mockReturnValue({ params: { field: 'displayName' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    fireEvent.changeText(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.DISPLAY_NAME_INPUT),
      '  Laser Gains  ',
    );

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.DISPLAY_NAME_SAVE),
      );
    });

    expect(checkDisplayNameValidity).toHaveBeenCalledWith('Laser Gains');
    expect(updateProfile).toHaveBeenCalledWith({
      display_name: 'Laser Gains',
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('saves the next display name after a rejected one', async () => {
    const updateProfile = jest.fn().mockResolvedValue(undefined);
    const checkDisplayNameValidity = jest
      .fn()
      .mockResolvedValueOnce({ valid: false })
      .mockResolvedValueOnce({ valid: true });
    mockUseProfileController.mockReturnValue(
      controllerBackedProfile({ updateProfile, checkDisplayNameValidity }),
    );
    mockUseRoute.mockReturnValue({ params: { field: 'displayName' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    fireEvent.changeText(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.DISPLAY_NAME_INPUT),
      'Bad Name',
    );
    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.DISPLAY_NAME_SAVE),
      );
    });

    expect(
      screen.getByText(
        strings('social_leaderboard.profile_onboarding.display_name_invalid'),
      ),
    ).toBeOnTheScreen();

    fireEvent.changeText(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.DISPLAY_NAME_INPUT),
      'Laser Gains',
    );
    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.DISPLAY_NAME_SAVE),
      );
    });

    expect(
      screen.queryByText(
        strings('social_leaderboard.profile_onboarding.display_name_invalid'),
      ),
    ).not.toBeOnTheScreen();
    expect(updateProfile).toHaveBeenCalledTimes(1);
    expect(updateProfile).toHaveBeenCalledWith({
      display_name: 'Laser Gains',
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('preserves username casing when checking availability and updating the handle', async () => {
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
      checkDisplayNameValidity: jest.fn(),
    });
    mockUseRoute.mockReturnValue({ params: { field: 'handle' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    fireEvent.changeText(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.HANDLE_INPUT),
      ' @Laser_Gains ',
    );

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.HANDLE_SAVE),
      );
    });

    expect(checkUsernameAvailability).toHaveBeenCalledWith('Laser_Gains');
    expect(updateProfile).toHaveBeenCalledWith({ username: 'Laser_Gains' });
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
      checkDisplayNameValidity: jest.fn(),
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
      checkDisplayNameValidity: jest.fn(),
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
      checkDisplayNameValidity: jest.fn(),
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
      checkDisplayNameValidity: jest.fn(),
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

  // The cap must match the API's `@MaxLength(160)` bio rule: an over-long bio
  // comes back as the same 400 as refused content, and the copy below says
  // "isn't allowed", which would be the wrong reason.
  it("caps the bio at the API's 160 characters", () => {
    mockUseRoute.mockReturnValue({ params: { field: 'bio' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    expect(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_INPUT).props
        .maxLength,
    ).toBe(160);
  });

  // TextField puts its testID on the wrapper, so its input is found by value.
  it('focuses the display name input when the editor opens', () => {
    mockUseRoute.mockReturnValue({ params: { field: 'displayName' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    expect(screen.getByDisplayValue('Giga Whale').props.autoFocus).toBe(true);
  });

  it('focuses the bio input when the editor opens', () => {
    mockUseRoute.mockReturnValue({ params: { field: 'bio' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    expect(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_INPUT).props
        .autoFocus,
    ).toBe(true);
  });

  it('does not focus the handle input when the editor opens', () => {
    mockUseRoute.mockReturnValue({ params: { field: 'handle' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    expect(
      screen.getByDisplayValue('giga-whale.metamask').props.autoFocus,
    ).toBe(false);
  });

  it('names refused content when the server rejects a display name', async () => {
    const updateProfile = jest.fn().mockRejectedValue(
      Object.assign(new Error('failed to update profile: 400'), {
        httpStatus: 400,
      }),
    );
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
      checkDisplayNameValidity: jest.fn().mockResolvedValue({ valid: true }),
    });
    mockUseRoute.mockReturnValue({ params: { field: 'displayName' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    fireEvent.changeText(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.DISPLAY_NAME_INPUT),
      'something the server refuses',
    );

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.DISPLAY_NAME_SAVE),
      );
    });

    expect(
      screen.getByText(
        strings('social_leaderboard.profile_onboarding.display_name_invalid'),
      ),
    ).toBeOnTheScreen();
    // Neither the connection copy nor the bio's copy would explain a name.
    expect(
      screen.queryByText(
        strings('social_leaderboard.manage_profile.save_error'),
      ),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings('social_leaderboard.manage_profile.bio_prohibited'),
      ),
    ).not.toBeOnTheScreen();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('names refused content when the server rejects a bio', async () => {
    const updateProfile = jest.fn().mockRejectedValue(
      Object.assign(new Error('failed to update profile: 400'), {
        httpStatus: 400,
      }),
    );
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
      checkDisplayNameValidity: jest.fn().mockResolvedValue({ valid: true }),
    });
    mockUseRoute.mockReturnValue({ params: { field: 'bio' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    fireEvent.changeText(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_INPUT),
      'something the server refuses',
    );

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_SAVE),
      );
    });

    expect(
      screen.getByText(
        strings('social_leaderboard.manage_profile.bio_prohibited'),
      ),
    ).toBeOnTheScreen();
    // The connection copy would send the user back to the same content.
    expect(
      screen.queryByText(
        strings('social_leaderboard.manage_profile.save_error'),
      ),
    ).not.toBeOnTheScreen();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('keeps the connection copy when the save fails for any other reason', async () => {
    const updateProfile = jest
      .fn()
      .mockRejectedValue(new Error('Network request failed'));
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
      checkDisplayNameValidity: jest.fn().mockResolvedValue({ valid: true }),
    });
    mockUseRoute.mockReturnValue({ params: { field: 'bio' } });

    renderWithProvider(<ManageProfileTextEditorView />);

    fireEvent.changeText(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_INPUT),
      'a bio that never reaches the server',
    );

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_SAVE),
      );
    });

    expect(
      screen.getByText(strings('social_leaderboard.manage_profile.save_error')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings('social_leaderboard.manage_profile.bio_prohibited'),
      ),
    ).not.toBeOnTheScreen();
  });
});
