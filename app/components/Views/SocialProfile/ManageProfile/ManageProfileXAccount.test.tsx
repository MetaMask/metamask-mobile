import React from 'react';
import { act, fireEvent, within } from '@testing-library/react-native';
import type { XProfile } from '@metamask/profile-controller';

import ManageProfileXAccount from './ManageProfileXAccount';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { strings } from '../../../../../locales/i18n';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';
import { useXAuth, type UseXAuth } from '../../../../hooks/useXAuth';
import { XAuthError, XAuthErrorType } from '../../../../core/XAuthService';

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

const X_PROFILE: XProfile = {
  xUserId: 'x-user-1',
  xProfileUrl: 'https://x.com/tester',
  username: 'tester',
  displayName: 'Tester',
  avatarUrl: 'https://example.com/x.png',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const setXAuth = (overrides: Partial<UseXAuth> = {}) => {
  mockUseXAuth.mockReturnValue({
    isConnected: true,
    xProfile: X_PROFILE,
    isConnecting: false,
    isDisconnecting: false,
    isRefreshing: false,
    error: undefined,
    connect: mockConnect,
    disconnect: mockDisconnect,
    refresh: mockRefresh,
    ...overrides,
  });
};

describe('ManageProfileXAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefresh.mockResolvedValue(undefined);
    mockDisconnect.mockResolvedValue(undefined);
    setXAuth();
  });

  it('renders the header titled X account', () => {
    const { getByTestId } = renderWithProvider(<ManageProfileXAccount />);

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
    const { getByTestId, getByText } = renderWithProvider(
      <ManageProfileXAccount />,
    );

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
      ).getByText(strings('manage_profile.x_account_disconnect')),
    ).toBeOnTheScreen();
  });

  it('does not refresh when the X profile is already loaded', () => {
    renderWithProvider(<ManageProfileXAccount />);

    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('refreshes once and hides the handle when connected without an X profile', () => {
    setXAuth({ xProfile: undefined });

    const { queryByTestId, rerender } = renderWithProvider(
      <ManageProfileXAccount />,
    );
    rerender(<ManageProfileXAccount />);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(
      queryByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_HANDLE),
    ).toBeNull();
  });

  it('goes back when shown while not connected', () => {
    setXAuth({ isConnected: false, xProfile: undefined });

    renderWithProvider(<ManageProfileXAccount />);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not go back while a disconnect is in flight', () => {
    setXAuth({ isConnected: false, isDisconnecting: true });

    renderWithProvider(<ManageProfileXAccount />);

    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<ManageProfileXAccount />);

    fireEvent.press(getByTestId(CommonSelectorsIDs.BACK_ARROW_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  describe('disconnect sheet', () => {
    const openSheet = (utils: ReturnType<typeof renderWithProvider>): void => {
      fireEvent.press(
        utils.getByTestId(
          ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_BUTTON,
        ),
      );
    };

    it('opens the sheet without disconnecting', () => {
      const utils = renderWithProvider(<ManageProfileXAccount />);

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
      const utils = renderWithProvider(<ManageProfileXAccount />);
      openSheet(utils);

      fireEvent.press(
        utils.getByTestId(
          ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CANCEL,
        ),
      );

      expect(mockDisconnect).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('disconnects once and goes back once on success', async () => {
      const utils = renderWithProvider(<ManageProfileXAccount />);
      openSheet(utils);

      await act(async () => {
        fireEvent.press(
          utils.getByTestId(
            ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CONFIRM,
          ),
        );
      });

      expect(mockDisconnect).toHaveBeenCalledTimes(1);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('keeps the sheet open with an error and does not navigate on failure', async () => {
      mockDisconnect.mockResolvedValue(
        new XAuthError(XAuthErrorType.BackendError, 'backend down'),
      );
      const utils = renderWithProvider(<ManageProfileXAccount />);
      openSheet(utils);

      await act(async () => {
        fireEvent.press(
          utils.getByTestId(
            ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CONFIRM,
          ),
        );
      });

      expect(
        utils.getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_SHEET),
      ).toBeOnTheScreen();
      expect(
        utils.getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_ERROR),
      ).toHaveTextContent(strings('manage_profile.x_account_disconnect_error'));
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });
});
