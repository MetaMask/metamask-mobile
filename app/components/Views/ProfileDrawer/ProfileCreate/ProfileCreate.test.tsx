import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import ProfileCreate from './ProfileCreate';
import { renderScreen } from '../../../../util/test/renderWithProvider';
import { ProfileCreateViewSelectorsIDs } from '../ProfileDrawer.testIds';
import Routes from '../../../../constants/navigation/Routes';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { connectX, disconnectX } from '../../../../core/XAuthService';
import {
  XAuthError,
  XAuthErrorType,
} from '../../../../core/XAuthService/XAuthError';
import { getDefaultProfileControllerState } from '@metamask/profile-controller';
import Logger from '../../../../util/Logger';

const mockGoBack = jest.fn();
const mockShowToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: jest.fn() },
};
const globalWithDev = globalThis as { __DEV__?: boolean };
let originalDev: boolean | undefined;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: jest.fn(),
  }),
}));

// Fully mock the XAuthService module — the real module imports Engine.
jest.mock('../../../../core/XAuthService', () => ({
  connectX: jest.fn(),
  disconnectX: jest.fn(),
  XAuthError: jest.requireActual('../../../../core/XAuthService/XAuthError')
    .XAuthError,
  XAuthErrorType: jest.requireActual('../../../../core/XAuthService/XAuthError')
    .XAuthErrorType,
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

const PROFILE_WITH_ID = {
  ...getDefaultProfileControllerState().profile,
  profileId: 'profile-1',
};

const X_PROFILE = {
  xUserId: 'x-user-1',
  xProfileUrl: 'https://x.com/tester',
  username: 'tester',
  displayName: 'Tester',
  avatarUrl: 'https://example.com/x.png',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const stateWithProfileController = (
  controllerState: Record<string, unknown> = {},
) => ({
  engine: {
    backgroundState: {
      ProfileController: {
        ...getDefaultProfileControllerState(),
        ...controllerState,
      },
    },
  },
});

const ProfileCreateWrapper = () => (
  <ToastContext.Provider value={{ toastRef: mockToastRef }}>
    <ProfileCreate />
  </ToastContext.Provider>
);

const renderProfileCreate = async (state = stateWithProfileController()) => {
  const utils = renderScreen(
    ProfileCreateWrapper,
    {
      name: Routes.PROFILE_DRAWER.PROFILE_CREATE,
    },
    { state },
  );
  // Flush selector-driven subscriptions so state updates happen inside act()
  // and no act() warnings are emitted.
  await act(async () => {
    /* flush microtasks */
  });
  return utils;
};

const getStepperCta = () =>
  screen.getByTestId(`${ProfileCreateViewSelectorsIDs.STEPPER}-cta-button`);

describe('ProfileCreate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    originalDev = globalWithDev.__DEV__;
    (connectX as jest.Mock).mockResolvedValue({
      profile: PROFILE_WITH_ID,
      xProfile: X_PROFILE,
      profileCreated: true,
    });
    (disconnectX as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    globalWithDev.__DEV__ = originalDev;
  });

  describe('Rendering', () => {
    it('renders the screen container without crashing', async () => {
      await renderProfileCreate();

      expect(
        screen.getByTestId(ProfileCreateViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the header close button', async () => {
      await renderProfileCreate();

      expect(
        screen.getByTestId(ProfileCreateViewSelectorsIDs.CLOSE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders the first onboarding step content', async () => {
      await renderProfileCreate();

      expect(
        screen.getByTestId(
          `${ProfileCreateViewSelectorsIDs.STEPPER}-container`,
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText('Create your profile')).toBeOnTheScreen();
      expect(
        screen.getByText(
          'Set up a social profile to connect with others in MetaMask.',
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('X connection', () => {
    it('shows the Connect X CTA and advances to step 2 after a successful connect (backend auto-creates the profile)', async () => {
      // No profile exists in state yet — connecting X creates it server-side.
      await renderProfileCreate();

      expect(screen.getByText('Connect X')).toBeOnTheScreen();

      fireEvent.press(getStepperCta());

      await waitFor(() => {
        expect(screen.getByText('Connect with others')).toBeOnTheScreen();
      });
      expect(connectX).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Create your profile')).not.toBeOnTheScreen();
    });

    it('shows Connecting... while in flight and ignores a second press', async () => {
      let resolveConnect!: (value: {
        profile: typeof PROFILE_WITH_ID;
        xProfile: typeof X_PROFILE;
        profileCreated: boolean;
      }) => void;
      const connectPromise = new Promise<{
        profile: typeof PROFILE_WITH_ID;
        xProfile: typeof X_PROFILE;
        profileCreated: boolean;
      }>((resolve) => {
        resolveConnect = resolve;
      });
      (connectX as jest.Mock).mockReturnValue(connectPromise);
      await renderProfileCreate();

      fireEvent.press(getStepperCta());

      await waitFor(() => {
        expect(screen.getByText('Connecting...')).toBeOnTheScreen();
      });

      // A second press while in flight must not re-invoke connectX.
      fireEvent.press(getStepperCta());
      expect(connectX).toHaveBeenCalledTimes(1);

      act(() => {
        resolveConnect({
          profile: PROFILE_WITH_ID,
          xProfile: X_PROFILE,
          profileCreated: true,
        });
      });
      await waitFor(() => {
        expect(screen.getByText('Connect with others')).toBeOnTheScreen();
      });
    });

    it('stays on step 1 silently when the user cancels the X connect', async () => {
      (connectX as jest.Mock).mockRejectedValue(
        new XAuthError(XAuthErrorType.UserCancelled, 'User cancelled'),
      );
      await renderProfileCreate();

      fireEvent.press(getStepperCta());

      await waitFor(() => {
        expect(screen.queryByText('Connecting...')).not.toBeOnTheScreen();
      });
      expect(screen.getByText('Connect X')).toBeOnTheScreen();
      expect(screen.getByText('Create your profile')).toBeOnTheScreen();
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('stays on step 1, shows a toast, and logs on connect failure', async () => {
      (connectX as jest.Mock).mockRejectedValue(
        new XAuthError(
          XAuthErrorType.BackendError,
          'Failed to connect X account: 500',
        ),
      );
      await renderProfileCreate();

      fireEvent.press(getStepperCta());

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: ToastVariants.Plain,
            labelOptions: [
              { label: "Couldn't connect your X account. Try again." },
            ],
            hasNoTimeout: false,
          }),
        );
      });
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'ProfileCreate: X connect failed',
      );
      await waitFor(() => {
        expect(screen.queryByText('Connecting...')).not.toBeOnTheScreen();
      });
      expect(screen.getByText('Create your profile')).toBeOnTheScreen();
    });

    it('shows the connected state and advances without calling connectX when X is already connected', async () => {
      await renderProfileCreate(
        stateWithProfileController({
          profile: { ...PROFILE_WITH_ID, connectedToX: true },
          xProfile: X_PROFILE,
        }),
      );

      await waitFor(() => {
        expect(
          screen.getByText('Your X account is connected.'),
        ).toBeOnTheScreen();
      });
      expect(screen.getByText('Next')).toBeOnTheScreen();

      fireEvent.press(getStepperCta());

      await waitFor(() => {
        expect(screen.getByText('Connect with others')).toBeOnTheScreen();
      });
      expect(connectX).not.toHaveBeenCalled();
    });

    it('shows the connected state when the profile reports connectedToX without a stored X profile', async () => {
      await renderProfileCreate(
        stateWithProfileController({
          profile: { ...PROFILE_WITH_ID, connectedToX: true },
        }),
      );

      await waitFor(() => {
        expect(
          screen.getByText('Your X account is connected.'),
        ).toBeOnTheScreen();
      });
      expect(connectX).not.toHaveBeenCalled();
    });

    it('connects without a profile in state, relying on the backend auto-create', async () => {
      // Default state: no profile and no linked X account. Connecting X
      // creates the profile server-side, so the flow must not abort.
      await renderProfileCreate();

      fireEvent.press(getStepperCta());

      await waitFor(() => {
        expect(screen.getByText('Connect with others')).toBeOnTheScreen();
      });
      expect(connectX).toHaveBeenCalledTimes(1);
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(Logger.error).not.toHaveBeenCalled();
    });
  });

  describe('X disconnect (dev-only)', () => {
    it('shows the disconnect button when connected and calls disconnectX', async () => {
      // The RN jest preset pins __DEV__ to false; the button is dev-only.
      globalWithDev.__DEV__ = true;
      await renderProfileCreate(
        stateWithProfileController({
          profile: { ...PROFILE_WITH_ID, connectedToX: true },
          xProfile: X_PROFILE,
        }),
      );

      await waitFor(() => {
        expect(screen.getByText('Disconnect X (dev)')).toBeOnTheScreen();
      });

      // StepperCard's secondaryCta renders without a testID, so the button
      // is pressed via its unique label text.
      fireEvent.press(screen.getByText('Disconnect X (dev)'));

      await waitFor(() => {
        expect(disconnectX).toHaveBeenCalledTimes(1);
      });
    });

    it('shows a toast and logs when the X disconnect fails', async () => {
      // The RN jest preset pins __DEV__ to false; the button is dev-only.
      globalWithDev.__DEV__ = true;
      (disconnectX as jest.Mock).mockRejectedValue(
        new Error('backend returned 500'),
      );
      await renderProfileCreate(
        stateWithProfileController({
          profile: { ...PROFILE_WITH_ID, connectedToX: true },
          xProfile: X_PROFILE,
        }),
      );

      await waitFor(() => {
        expect(screen.getByText('Disconnect X (dev)')).toBeOnTheScreen();
      });
      fireEvent.press(screen.getByText('Disconnect X (dev)'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: ToastVariants.Plain,
            labelOptions: [
              { label: "Couldn't disconnect your X account. Try again." },
            ],
            hasNoTimeout: false,
          }),
        );
      });
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'ProfileCreate: X disconnect failed',
      );
    });

    it('does not show the disconnect button when X is not connected', async () => {
      await renderProfileCreate();

      expect(screen.queryByText('Disconnect X (dev)')).not.toBeOnTheScreen();
    });

    it('does not show the disconnect button in non-dev builds even when connected', async () => {
      globalWithDev.__DEV__ = false;
      await renderProfileCreate(
        stateWithProfileController({
          profile: { ...PROFILE_WITH_ID, connectedToX: true },
          xProfile: X_PROFILE,
        }),
      );

      await waitFor(() => {
        expect(
          screen.getByText('Your X account is connected.'),
        ).toBeOnTheScreen();
      });
      expect(screen.queryByText('Disconnect X (dev)')).not.toBeOnTheScreen();
    });
  });

  describe('Stepper navigation', () => {
    it('calls goBack when the final step CTA is pressed', async () => {
      // Take the already-connected path so step 1's primary CTA is "Next".
      await renderProfileCreate(
        stateWithProfileController({
          profile: { ...PROFILE_WITH_ID, connectedToX: true },
          xProfile: X_PROFILE,
        }),
      );

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeOnTheScreen();
      });
      // Advance from step 1 to step 2, then to the final step 3.
      fireEvent.press(getStepperCta());
      fireEvent.press(getStepperCta());

      // Final CTA advances past the last step, triggering StepperCard's
      // onComplete -> handleClose -> navigation.goBack().
      fireEvent.press(getStepperCta());

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Header actions', () => {
    it('calls goBack when the close button is pressed', async () => {
      await renderProfileCreate();

      fireEvent.press(
        screen.getByTestId(ProfileCreateViewSelectorsIDs.CLOSE_BUTTON),
      );

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
