import React from 'react';
import { act, fireEvent, render, within } from '@testing-library/react-native';
import type { XProfile } from '@metamask/profile-controller';

import ManageProfileXAccount from './ManageProfileXAccount';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { BottomSheet } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';
import { useXAuth, type UseXAuth } from '../../../../hooks/useXAuth';
import { XAuthError, XAuthErrorType } from '../../../../core/XAuthService';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../../../../hooks/useXAuth');

const mockUseXAuth = jest.mocked(useXAuth);
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockRefresh = jest.fn();
const mockShowToast = jest.fn();
const mockTrackProfileEdited = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: jest.fn() },
};

jest.mock('../../../../hooks/useManageProfileAnalytics', () => ({
  useManageProfileAnalytics: () => mockTrackProfileEdited,
}));

const X_PROFILE: XProfile = {
  xUserId: 'x-user-1',
  xProfileUrl: 'https://x.com/tester',
  username: 'tester',
  displayName: 'Tester',
  avatarUrl: 'https://example.com/x.png',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

/**
 * The screen reads its outcome from hook state, not from the action's return
 * value, so the mock has to be a live snapshot the test can mutate and
 * re-render with.
 */
let xAuthState: UseXAuth;

const defaultXAuth = (): UseXAuth => ({
  isConnected: true,
  xProfile: X_PROFILE,
  isConnecting: false,
  isDisconnecting: false,
  isRefreshing: false,
  connectError: undefined,
  disconnectError: undefined,
  refreshError: undefined,
  connect: mockConnect,
  disconnect: mockDisconnect,
  refresh: mockRefresh,
});

describe('ManageProfileXAccount', () => {
  // A fresh element per render: reusing one element instance makes React bail
  // out of the re-render, so the hook mock would never be read again.
  const renderTree = () => (
    <ToastContext.Provider value={{ toastRef: mockToastRef }}>
      <ManageProfileXAccount />
    </ToastContext.Provider>
  );

  const renderScreen = () => {
    const utils = renderWithProvider(renderTree());
    return {
      ...utils,
      /** Mirrors what ProfileController writes when the action settles. */
      updateXAuth: (next: Partial<UseXAuth>) => {
        xAuthState = { ...xAuthState, ...next };
        act(() => {
          utils.rerender(renderTree());
        });
      },
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    xAuthState = defaultXAuth();
    mockUseXAuth.mockImplementation(() => xAuthState);
    mockRefresh.mockResolvedValue(undefined);
    mockDisconnect.mockResolvedValue(undefined);
  });

  it('renders the header titled X account', () => {
    const { getByTestId } = renderScreen();

    expect(
      getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_SCREEN),
    ).toBeOnTheScreen();
    expect(
      within(getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_HEADER)).getByText(
        strings('manage_profile.x_account'),
      ),
    ).toBeOnTheScreen();
  });

  it('renders the avatar, handle, disconnect copy and Disconnect button', () => {
    const { getByTestId, getByText } = renderScreen();

    expect(
      getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_AVATAR),
    ).toBeOnTheScreen();
    expect(
      getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_HANDLE),
    ).toHaveTextContent('@tester');
    expect(
      getByText(strings('manage_profile.x_account_disconnect_body')),
    ).toBeOnTheScreen();
    expect(
      within(
        getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_BUTTON),
      ).getByText(strings('common.disconnect')),
    ).toBeOnTheScreen();
  });

  it('does not refresh when the X profile is already loaded', () => {
    renderScreen();

    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('refreshes once and hides the handle when connected without an X profile', () => {
    xAuthState = { ...xAuthState, xProfile: undefined };

    const { queryByTestId, updateXAuth } = renderScreen();
    updateXAuth({});

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(
      queryByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_HANDLE),
    ).toBeNull();
  });

  it('goes back when shown while not connected', () => {
    xAuthState = { ...xAuthState, isConnected: false, xProfile: undefined };

    renderScreen();

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockShowToast).not.toHaveBeenCalled();
    // Merely opening the screen while already disconnected is not an edit.
    expect(mockTrackProfileEdited).not.toHaveBeenCalled();
  });

  it('does not go back while a disconnect is in flight', () => {
    xAuthState = {
      ...xAuthState,
      isConnected: false,
      isDisconnecting: true,
    };

    renderScreen();

    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(CommonSelectorsIDs.BACK_ARROW_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  describe('disconnect sheet', () => {
    const openSheet = (utils: ReturnType<typeof renderScreen>): void => {
      fireEvent.press(
        utils.getByTestId(
          ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_BUTTON,
        ),
      );
    };

    it('opens the sheet without disconnecting', () => {
      const utils = renderScreen();

      expect(
        utils.queryByTestId(
          ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_SHEET,
        ),
      ).toBeNull();

      openSheet(utils);

      expect(
        utils.getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_SHEET),
      ).toBeOnTheScreen();
      expect(mockDisconnect).not.toHaveBeenCalled();
    });

    it('does not disconnect when Cancel is pressed', () => {
      const utils = renderScreen();
      openSheet(utils);

      fireEvent.press(
        utils.getByTestId(
          ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CANCEL,
        ),
      );

      expect(mockDisconnect).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('disconnects once, shows a success toast and goes back once', async () => {
      const utils = renderScreen();
      openSheet(utils);

      await act(async () => {
        fireEvent.press(
          utils.getByTestId(
            ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CONFIRM,
          ),
        );
      });

      expect(mockDisconnect).toHaveBeenCalledTimes(1);

      // The controller clears the X link, which is how success is observed.
      utils.updateXAuth({ isConnected: false, xProfile: undefined });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      const toastOptions = mockShowToast.mock.calls[0][0];
      expect(toastOptions).toEqual(
        expect.objectContaining({
          variant: ToastVariants.Plain,
          labelOptions: [
            {
              label: strings('manage_profile.x_account_disconnect_success'),
              isBold: true,
            },
          ],
          hasNoTimeout: false,
        }),
      );
      expect(
        render(<>{toastOptions.startAccessory}</>).getByTestId(
          ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_SUCCESS_ICON,
        ),
      ).toBeOnTheScreen();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      // A successful unlink is a Manage profile edit, so it reports the same
      // `profile_edited` event as the other editors.
      expect(mockTrackProfileEdited).toHaveBeenCalledTimes(1);
    });

    it('keeps the sheet open with an error and does not navigate on failure', async () => {
      const utils = renderScreen();
      openSheet(utils);

      await act(async () => {
        fireEvent.press(
          utils.getByTestId(
            ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CONFIRM,
          ),
        );
      });

      // A failed disconnect leaves the link in place and records an error.
      utils.updateXAuth({
        disconnectError: new XAuthError(
          XAuthErrorType.BackendError,
          'backend down',
        ),
      });

      expect(
        utils.getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_SHEET),
      ).toBeOnTheScreen();
      expect(
        utils.getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_ERROR),
      ).toHaveTextContent(strings('manage_profile.x_account_disconnect_error'));
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockTrackProfileEdited).not.toHaveBeenCalled();
    });

    it('toasts success and goes back once when the refresh failure lands after the link is cleared', async () => {
      xAuthState = { ...xAuthState, xProfile: undefined };
      const utils = renderScreen();
      openSheet(utils);

      await act(async () => {
        fireEvent.press(
          utils.getByTestId(
            ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CONFIRM,
          ),
        );
      });

      // The screen refreshed because it mounted connected without a profile.
      expect(mockRefresh).toHaveBeenCalledTimes(1);

      // The disconnect succeeds and clears the link, while the in-flight
      // refresh fails because the link is gone. Only `refreshError` moves.
      utils.updateXAuth({
        isConnected: false,
        xProfile: undefined,
        refreshError: new XAuthError(
          XAuthErrorType.BackendError,
          'Failed to fetch and update the X account',
        ),
      });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast.mock.calls[0][0].labelOptions).toStrictEqual([
        {
          label: strings('manage_profile.x_account_disconnect_success'),
          isBold: true,
        },
      ]);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockTrackProfileEdited).toHaveBeenCalledTimes(1);

      // A later write to the refresh error re-runs the effect; the settled
      // latch must keep it from navigating a second time.
      utils.updateXAuth({
        refreshError: new XAuthError(XAuthErrorType.NetworkFailure, 'offline'),
      });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockTrackProfileEdited).toHaveBeenCalledTimes(1);
    });

    it('blocks disconnect while a refresh is in flight and re-enables it once settled', () => {
      xAuthState = { ...xAuthState, xProfile: undefined, isRefreshing: true };
      const utils = renderScreen();

      expect(
        utils.getByTestId(
          ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_BUTTON,
        ),
      ).toBeDisabled();
      openSheet(utils);
      expect(
        utils.queryByTestId(
          ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_SHEET,
        ),
      ).toBeNull();

      utils.updateXAuth({ isRefreshing: false });

      expect(
        utils.getByTestId(
          ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_BUTTON,
        ),
      ).not.toBeDisabled();
      openSheet(utils);
      expect(
        utils.getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_SHEET),
      ).toBeOnTheScreen();
    });

    it('keeps the settled disconnect terminal when Disconnect is pressed again', async () => {
      const utils = renderScreen();
      openSheet(utils);

      await act(async () => {
        fireEvent.press(
          utils.getByTestId(
            ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CONFIRM,
          ),
        );
      });

      utils.updateXAuth({ isConnected: false, xProfile: undefined });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockGoBack).toHaveBeenCalledTimes(1);

      // `goBack` does not unmount this screen synchronously, so the settled
      // latch has to survive a second confirm attempt.
      const disconnectButton = utils.getByTestId(
        ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_BUTTON,
      );
      expect(disconnectButton).toBeDisabled();

      fireEvent.press(disconnectButton);

      expect(
        utils.queryByTestId(
          ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_SHEET,
        ),
      ).toBeNull();
      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockTrackProfileEdited).toHaveBeenCalledTimes(1);
    });

    it('still reports a successful disconnect dismissed through the backdrop mid-flight', async () => {
      const utils = renderScreen();
      openSheet(utils);

      await act(async () => {
        fireEvent.press(
          utils.getByTestId(
            ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CONFIRM,
          ),
        );
      });

      utils.updateXAuth({ isDisconnecting: true });

      const sheet = utils.UNSAFE_getByType(BottomSheet);
      expect(sheet.props.isInteractable).toBe(false);

      // The backdrop press and the pan gesture call `goBack` directly, so the
      // screen has to hold the pending phase against them itself.
      act(() => {
        sheet.props.goBack();
      });

      utils.updateXAuth({
        isConnected: false,
        xProfile: undefined,
        isDisconnecting: false,
      });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockTrackProfileEdited).toHaveBeenCalledTimes(1);
    });

    it('clears a failed disconnect error when the sheet is reopened after Cancel', async () => {
      const utils = renderScreen();
      openSheet(utils);

      await act(async () => {
        fireEvent.press(
          utils.getByTestId(
            ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CONFIRM,
          ),
        );
      });

      utils.updateXAuth({
        disconnectError: new XAuthError(
          XAuthErrorType.BackendError,
          'backend down',
        ),
      });

      fireEvent.press(
        utils.getByTestId(
          ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CANCEL,
        ),
      );
      openSheet(utils);

      expect(
        utils.queryByTestId(
          ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_ERROR,
        ),
      ).toBeNull();
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('does not report a refresh failure as a failed disconnect', async () => {
      xAuthState = { ...xAuthState, xProfile: undefined };
      const utils = renderScreen();
      openSheet(utils);

      await act(async () => {
        fireEvent.press(
          utils.getByTestId(
            ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CONFIRM,
          ),
        );
      });

      // The link is still connected and only the profile refresh failed, so
      // the sheet stays open and shows no disconnect error.
      utils.updateXAuth({
        refreshError: new XAuthError(XAuthErrorType.NetworkFailure, 'offline'),
      });

      expect(
        utils.queryByTestId(
          ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_ERROR,
        ),
      ).toBeNull();
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });
});
