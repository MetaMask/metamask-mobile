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
import {
  connectX,
  isXConnected,
  XAuthError,
  XAuthErrorType,
} from '../../../../core/XAuthService';
import Logger from '../../../../util/Logger';

const mockGoBack = jest.fn();
const mockShowToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: jest.fn() },
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: jest.fn(),
  }),
}));

jest.mock('../../../../core/XAuthService', () => ({
  ...jest.requireActual('../../../../core/XAuthService'),
  connectX: jest.fn(),
  isXConnected: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

const ProfileCreateWrapper = () => (
  <ToastContext.Provider value={{ toastRef: mockToastRef }}>
    <ProfileCreate />
  </ToastContext.Provider>
);

const renderProfileCreate = async () => {
  const utils = renderScreen(ProfileCreateWrapper, {
    name: Routes.PROFILE_DRAWER.PROFILE_CREATE,
  });
  // Flush the on-mount isXConnected() check so its state update happens
  // inside act() and no act() warnings are emitted.
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
    (isXConnected as jest.Mock).mockResolvedValue(false);
    (connectX as jest.Mock).mockResolvedValue(undefined);
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
    it('shows the Connect X CTA and advances to step 2 after a successful connect', async () => {
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
      let resolveConnect!: (value: undefined) => void;
      const connectPromise = new Promise<undefined>((resolve) => {
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
        resolveConnect(undefined);
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
        new Error('token endpoint returned 400'),
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
      (isXConnected as jest.Mock).mockResolvedValue(true);
      await renderProfileCreate();

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
  });

  describe('Stepper navigation', () => {
    it('calls goBack when the final step CTA is pressed', async () => {
      // Take the already-connected path so step 1's primary CTA is "Next".
      (isXConnected as jest.Mock).mockResolvedValue(true);
      await renderProfileCreate();

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
