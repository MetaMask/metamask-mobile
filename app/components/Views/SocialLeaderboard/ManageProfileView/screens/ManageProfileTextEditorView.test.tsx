import React from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
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

interface BeforeRemoveEvent {
  data: { action: { type: string } };
  preventDefault: () => void;
}

const beforeRemoveListeners = new Set<(event: BeforeRemoveEvent) => void>();

const emitBeforeRemove = (action: { type: string }): boolean => {
  let prevented = false;
  beforeRemoveListeners.forEach((listener) => {
    listener({
      data: { action },
      preventDefault: () => {
        prevented = true;
      },
    });
  });
  return prevented;
};

const mockDispatch = jest.fn((action: { type: string }) => {
  emitBeforeRemove(action);
});
const mockGoBack = jest.fn(() => {
  emitBeforeRemove({ type: 'GO_BACK' });
});
const mockAddListener = jest.fn(
  (event: string, listener: (event: BeforeRemoveEvent) => void) => {
    if (event === 'beforeRemove') {
      beforeRemoveListeners.add(listener);
    }
    return () => {
      beforeRemoveListeners.delete(listener);
    };
  },
);
const mockNavigation = {
  goBack: mockGoBack,
  dispatch: mockDispatch,
  addListener: mockAddListener,
};

const mockUseRoute = jest.fn<
  { key?: string; params: { field: ManageProfileTextEditorField } },
  []
>();
const mockUseMyProfile = jest.fn<UseMyProfileResult, []>();
const mockUseProfileController = jest.fn<UseProfileControllerResult, []>();

jest.mock('@react-navigation/native', () => {
  const ReactActual = jest.requireActual('react') as typeof import('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => mockNavigation,
    useRoute: () => ({
      key: 'manage-profile-text-editor-route',
      ...mockUseRoute(),
    }),
    usePreventRemove: (
      preventRemove: boolean,
      callback: (payload: { data: { action: { type: string } } }) => void,
    ) => {
      const preventRef = ReactActual.useRef(preventRemove);
      const callbackRef = ReactActual.useRef(callback);
      preventRef.current = preventRemove;
      callbackRef.current = callback;

      ReactActual.useEffect(
        () =>
          mockNavigation.addListener('beforeRemove', (e: BeforeRemoveEvent) => {
            if (!preventRef.current) {
              return;
            }
            e.preventDefault();
            callbackRef.current({ data: e.data });
          }),
        [],
      );
    },
  };
});

jest.mock('../../MyProfileView/hooks/useMyProfile', () => ({
  useMyProfile: () => mockUseMyProfile(),
}));

jest.mock('../hooks/useProfileController', () => ({
  useProfileController: () => mockUseProfileController(),
}));

describe('ManageProfileTextEditorView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    beforeRemoveListeners.clear();
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
    mockUseProfileController.mockReturnValue(
      controllerBackedProfile({
        isControllerBacked: false,
        checkUsernameAvailability: jest.fn().mockResolvedValue({
          username: 'giga-whale',
          available: true,
          valid: true,
          normalized: 'giga-whale',
          errors: [],
        }),
      }),
    );
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

    expect(checkDisplayNameValidity).toHaveBeenCalledWith('Bad Name');
    expect(updateProfile).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        strings('social_leaderboard.errors.display_name_invalid'),
      ),
    ).toBeOnTheScreen();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('shows the length rule for a stored display name over 50 characters', async () => {
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
        strings('social_leaderboard.errors.display_name_too_long', {
          max: MAX_DISPLAY_NAME_LENGTH,
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings('social_leaderboard.errors.display_name_invalid'),
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
        strings('social_leaderboard.errors.display_name_check_error'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings('social_leaderboard.errors.display_name_invalid'),
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
        strings('social_leaderboard.errors.display_name_invalid'),
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
        strings('social_leaderboard.errors.display_name_invalid'),
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
    mockUseProfileController.mockReturnValue(
      controllerBackedProfile({ updateProfile, checkUsernameAvailability }),
    );
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
    mockUseProfileController.mockReturnValue(
      controllerBackedProfile({ updateProfile, checkUsernameAvailability }),
    );
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
    mockUseProfileController.mockReturnValue(
      controllerBackedProfile({ updateProfile, checkUsernameAvailability }),
    );
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
    mockUseProfileController.mockReturnValue(
      controllerBackedProfile({ updateProfile, checkUsernameAvailability }),
    );
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
    mockUseProfileController.mockReturnValue(
      controllerBackedProfile({ updateProfile, checkUsernameAvailability }),
    );
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
    mockUseProfileController.mockReturnValue(
      controllerBackedProfile({ updateProfile }),
    );
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
        strings('social_leaderboard.errors.display_name_invalid'),
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
    mockUseProfileController.mockReturnValue(
      controllerBackedProfile({ updateProfile }),
    );
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
    mockUseProfileController.mockReturnValue(
      controllerBackedProfile({ updateProfile }),
    );
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

  describe('Android keyboard and bottom inset clearance', () => {
    const safeArea = jest.requireMock('react-native-safe-area-context') as {
      useSafeAreaInsets: () => {
        top: number;
        right: number;
        bottom: number;
        left: number;
      };
    };

    const getSaveFooterPaddingBottom = (
      saveTestID: string,
    ): number | undefined => {
      let node = screen.getByTestId(saveTestID).parent;
      while (node) {
        const flat = StyleSheet.flatten(node.props?.style);
        if (flat && typeof flat.paddingBottom === 'number') {
          return flat.paddingBottom;
        }
        node = node.parent;
      }
      return undefined;
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('lifts Save above the keyboard on Android and clears the navigation bar when hidden', () => {
      const platformDescriptor = Object.getOwnPropertyDescriptor(
        Platform,
        'OS',
      );
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        get: () => 'android',
      });
      jest
        .spyOn(safeArea, 'useSafeAreaInsets')
        .mockReturnValue({ top: 30, right: 0, bottom: 48, left: 0 });
      const listeners = new Map<string, ((event?: unknown) => void)[]>();
      const addListenerMock = Keyboard.addListener as jest.Mock;
      const originalAddListener = addListenerMock.getMockImplementation();
      addListenerMock.mockImplementation((eventName, callback) => {
        const callbacks = listeners.get(eventName) ?? [];
        callbacks.push(callback as (event?: unknown) => void);
        listeners.set(eventName, callbacks);
        return { remove: jest.fn() } as unknown as ReturnType<
          typeof Keyboard.addListener
        >;
      });

      try {
        mockUseRoute.mockReturnValue({ params: { field: 'bio' } });
        renderWithProvider(<ManageProfileTextEditorView />);

        // Keyboard hidden: clears the 48dp Android 3-button navigation bar + 16dp gap.
        expect(
          getSaveFooterPaddingBottom(ManageProfileEditorSelectorsIDs.BIO_SAVE),
        ).toBe(64);

        act(() => {
          listeners.get('keyboardDidShow')?.forEach((callback) => {
            callback({ endCoordinates: { height: 320 } });
          });
        });

        // Keyboard visible: clears the 320dp keyboard + 16dp gap.
        expect(
          getSaveFooterPaddingBottom(ManageProfileEditorSelectorsIDs.BIO_SAVE),
        ).toBe(336);

        act(() => {
          listeners.get('keyboardDidHide')?.forEach((callback) => {
            callback();
          });
        });

        expect(
          getSaveFooterPaddingBottom(ManageProfileEditorSelectorsIDs.BIO_SAVE),
        ).toBe(64);
      } finally {
        if (originalAddListener) {
          addListenerMock.mockImplementation(originalAddListener);
        } else {
          addListenerMock.mockRestore();
        }
        if (platformDescriptor) {
          Object.defineProperty(Platform, 'OS', platformDescriptor);
        }
      }
    });

    it('offsets iOS KeyboardAvoidingView by the bottom inset so Save stays tight above the keyboard', () => {
      const platformDescriptor = Object.getOwnPropertyDescriptor(
        Platform,
        'OS',
      );
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        get: () => 'ios',
      });
      jest
        .spyOn(safeArea, 'useSafeAreaInsets')
        .mockReturnValue({ top: 59, right: 0, bottom: 34, left: 0 });

      try {
        mockUseRoute.mockReturnValue({ params: { field: 'bio' } });
        renderWithProvider(<ManageProfileTextEditorView />);

        const kav = screen.UNSAFE_getByType(KeyboardAvoidingView);
        expect(kav.props.behavior).toBe('padding');
        expect(kav.props.keyboardVerticalOffset).toBe(-34);
        expect(
          getSaveFooterPaddingBottom(ManageProfileEditorSelectorsIDs.BIO_SAVE),
        ).toBe(50);
      } finally {
        if (platformDescriptor) {
          Object.defineProperty(Platform, 'OS', platformDescriptor);
        }
      }
    });
  });

  describe('unsaved changes confirmation', () => {
    let alertSpy: jest.SpyInstance;

    beforeEach(() => {
      alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      mockUseProfileController.mockReturnValue(controllerBackedProfile());
      mockUseRoute.mockReturnValue({ params: { field: 'bio' } });
    });

    afterEach(() => {
      alertSpy.mockRestore();
    });

    it('leaves immediately when back is pressed with no edits', () => {
      renderWithProvider(<ManageProfileTextEditorView />);

      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_BACK),
      );

      expect(alertSpy).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('leaves immediately after an edit is reverted to the initial value', () => {
      mockUseMyProfile.mockReturnValue({
        profile: {
          profileId: 'current-user',
          displayName: 'Giga Whale',
          handle: 'giga-whale.metamask',
          bio: 'Original bio',
        },
        isLoading: false,
        error: null,
        refresh: jest.fn().mockResolvedValue(undefined),
      });
      renderWithProvider(<ManageProfileTextEditorView />);

      fireEvent.changeText(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_INPUT),
        'Edited bio',
      );
      fireEvent.changeText(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_INPUT),
        'Original bio',
      );
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_BACK),
      );

      expect(alertSpy).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('prompts before discarding unsaved edits and keeps the draft on Cancel', () => {
      renderWithProvider(<ManageProfileTextEditorView />);

      fireEvent.changeText(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_INPUT),
        'Unsaved bio draft',
      );
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_BACK),
      );

      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(
        strings('social_leaderboard.manage_profile.discard_changes_title'),
        strings('social_leaderboard.manage_profile.discard_changes_message'),
        expect.arrayContaining([
          expect.objectContaining({
            text: strings('navigation.cancel'),
            style: 'cancel',
          }),
          expect.objectContaining({
            text: strings('social_leaderboard.manage_profile.discard'),
            style: 'destructive',
          }),
        ]),
        expect.objectContaining({ cancelable: true }),
      );
      expect(mockDispatch).not.toHaveBeenCalled();

      // A second back press while the alert is already open does not stack another alert.
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_BACK),
      );
      expect(alertSpy).toHaveBeenCalledTimes(1);

      const buttons = alertSpy.mock.calls[0][2] as {
        style?: string;
        onPress?: () => void;
      }[];
      act(() => {
        buttons.find((button) => button.style === 'cancel')?.onPress?.();
      });

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_INPUT).props
          .value,
      ).toBe('Unsaved bio draft');
    });

    it('dispatches the blocked navigation action once when Discard is confirmed', () => {
      renderWithProvider(<ManageProfileTextEditorView />);

      fireEvent.changeText(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_INPUT),
        'Draft to discard',
      );

      // Simulate Android system back / swipe back emitting beforeRemove.
      const systemBackAction = { type: 'GO_BACK' };
      const prevented = emitBeforeRemove(systemBackAction);
      expect(prevented).toBe(true);
      expect(alertSpy).toHaveBeenCalledTimes(1);

      const buttons = alertSpy.mock.calls[0][2] as {
        style?: string;
        onPress?: () => void;
      }[];
      act(() => {
        buttons.find((button) => button.style === 'destructive')?.onPress?.();
      });

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(systemBackAction);
      // Confirming Discard disarms usePreventRemove before dispatching, so the alert does not reopen.
      expect(alertSpy).toHaveBeenCalledTimes(1);
    });

    it('leaves without a discard prompt after a successful save', async () => {
      const updateProfile = jest.fn().mockResolvedValue(undefined);
      mockUseProfileController.mockReturnValue(
        controllerBackedProfile({ updateProfile }),
      );
      renderWithProvider(<ManageProfileTextEditorView />);

      fireEvent.changeText(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_INPUT),
        'Saved bio',
      );

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_SAVE),
        );
      });

      expect(updateProfile).toHaveBeenCalledWith({ bio: 'Saved bio' });
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('still prompts before discarding if saving failed', async () => {
      const updateProfile = jest.fn().mockRejectedValue(new Error('offline'));
      mockUseProfileController.mockReturnValue(
        controllerBackedProfile({ updateProfile }),
      );
      renderWithProvider(<ManageProfileTextEditorView />);

      fireEvent.changeText(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_INPUT),
        'Unsaved bio after error',
      );

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_SAVE),
        );
      });

      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_BACK),
      );

      expect(alertSpy).toHaveBeenCalledTimes(1);
    });

    it('blocks leaving without opening a discard alert while a save is in flight', async () => {
      let resolveSave: () => void = () => undefined;
      const updateProfile = jest.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSave = resolve;
          }),
      );
      mockUseProfileController.mockReturnValue(
        controllerBackedProfile({ updateProfile }),
      );
      renderWithProvider(<ManageProfileTextEditorView />);

      fireEvent.changeText(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_INPUT),
        'Saving bio',
      );
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_SAVE),
      );

      const prevented = emitBeforeRemove({ type: 'GO_BACK' });
      expect(prevented).toBe(true);
      expect(alertSpy).not.toHaveBeenCalled();

      await act(async () => {
        resolveSave();
      });

      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('does not prompt when Save is disabled', () => {
      mockUseProfileController.mockReturnValue(
        controllerBackedProfile({ isControllerBacked: false }),
      );
      renderWithProvider(<ManageProfileTextEditorView />);

      fireEvent.changeText(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_INPUT),
        'Cannot save this',
      );
      fireEvent.press(
        screen.getByTestId(ManageProfileEditorSelectorsIDs.BIO_BACK),
      );

      expect(alertSpy).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
