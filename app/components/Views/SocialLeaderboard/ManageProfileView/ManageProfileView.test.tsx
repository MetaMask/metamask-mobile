import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_2,
} from '../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { renderShortAddress } from '../../../../util/address';
import type { LinkableSocialAccount } from '../hooks/useLinkableSocialAccounts';
import type { UseMyProfileResult } from '../MyProfileView/hooks/useMyProfile';
import type { UseProfileControllerResult } from './hooks/useProfileController';
import type { XProfile } from '@metamask/profile-controller';
import type { UseXAuth } from '../../../../hooks/useXAuth';
import { XAuthError, XAuthErrorType } from '../../../../core/XAuthService';
import ManageProfileView from './ManageProfileView';
import { ManageProfileViewSelectorsIDs } from './ManageProfileView.testIds';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockUseMyProfile = jest.fn<UseMyProfileResult, []>();
const mockUseProfileController = jest.fn<UseProfileControllerResult, []>();
const mockUseLinkableSocialAccounts = jest.fn<LinkableSocialAccount[], []>();

jest.mock('../hooks/useLinkableSocialAccounts', () => ({
  useLinkableSocialAccounts: () => mockUseLinkableSocialAccounts(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
}));

jest.mock('../MyProfileView/hooks/useMyProfile', () => ({
  useMyProfile: () => mockUseMyProfile(),
}));

jest.mock('./hooks/useProfileController', () => ({
  useProfileController: () => mockUseProfileController(),
}));

const mockConnect = jest.fn<Promise<void>, []>();
const mockUseXAuth = jest.fn<UseXAuth, []>();
jest.mock('../../../../hooks/useXAuth', () => ({
  useXAuth: () => mockUseXAuth(),
}));

const xProfile: XProfile = {
  xUserId: 'x-1',
  xProfileUrl: 'https://x.com/giga-whale',
  username: 'giga-whale',
  displayName: 'Giga Whale',
  avatarUrl: 'https://example.com/avatar.png',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const xAuthResult = (overrides: Partial<UseXAuth> = {}): UseXAuth => ({
  isConnected: true,
  xProfile,
  isConnecting: false,
  isDisconnecting: false,
  isRefreshing: false,
  connectError: undefined,
  disconnectError: undefined,
  refreshError: undefined,
  connect: mockConnect,
  disconnect: jest.fn().mockResolvedValue(undefined),
  refresh: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual(
    '@metamask/design-system-react-native',
  ) as Record<string, unknown>;
  const { View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');
  return {
    ...actual,
    AvatarAccount: ({ testID }: { testID?: string }) => (
      <View testID={testID} />
    ),
  };
});

const profile: UseMyProfileResult['profile'] = {
  profileId: 'current-user',
  displayName: 'Giga Whale',
  handle: 'giga-whale.metamask',
  bio: 'Trading in the open.',
  imageUrl: null,
  rankingTag: 'whale',
  xHandle: 'giga-whale',
  connectedToX: true,
  followerCount: 0,
  followingCount: 0,
  linkedAccountAddress: MOCK_ADDRESS_2,
  shareTradingActivity: true,
};

const state = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

const controllerResult = (
  overrides: Partial<UseProfileControllerResult> = {},
): UseProfileControllerResult => ({
  isControllerBacked: true,
  profile: undefined,
  linkedAddresses: [],
  updateProfile: jest.fn().mockResolvedValue(undefined),
  createProfile: jest.fn().mockResolvedValue(undefined),
  fetchAndUpdateProfile: jest.fn(),
  fetchAndUpdateXAccount: jest.fn(),
  disconnectX: jest.fn().mockResolvedValue(undefined),
  getXAuthorizationUrl: jest.fn(),
  checkUsernameAvailability: jest.fn(),
  ...overrides,
});

describe('ManageProfileView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMyProfile.mockReturnValue({
      profile,
      isLoading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    mockUseProfileController.mockReturnValue(controllerResult());
    mockConnect.mockResolvedValue(undefined);
    mockUseXAuth.mockReturnValue(xAuthResult());
    mockUseLinkableSocialAccounts.mockReturnValue([
      {
        id: 'account-2',
        name: 'Trading Account',
        address: MOCK_ADDRESS_2.toLowerCase(),
        balanceLabel: '$10.00',
        linkedAddresses: [`eip155:1:${MOCK_ADDRESS_2.toLowerCase()}`],
      },
    ]);
  });

  it('renders mocked identity on About rows', () => {
    renderWithProvider(<ManageProfileView />, { state });

    expect(
      screen.getByTestId(ManageProfileViewSelectorsIDs.DISPLAY_NAME_ROW),
    ).toHaveTextContent(/Giga Whale/);
    expect(
      screen.getByTestId(ManageProfileViewSelectorsIDs.HANDLE_ROW),
    ).toHaveTextContent(/@giga-whale\.metamask/);
    expect(
      screen.getByTestId(ManageProfileViewSelectorsIDs.SOCIALS_ROW),
    ).toHaveTextContent(/X @giga-whale/);
  });

  it('shows live trading activity as On when sharing is public', () => {
    renderWithProvider(<ManageProfileView />, { state });

    expect(
      screen.getByTestId(ManageProfileViewSelectorsIDs.TRADING_ACTIVITY_ROW),
    ).toHaveTextContent(
      new RegExp(
        strings('social_leaderboard.manage_profile.trading_activity_on'),
      ),
    );
  });

  it('shows live trading activity as Off when sharing is private', () => {
    mockUseMyProfile.mockReturnValue({
      profile: { ...profile, shareTradingActivity: false },
      isLoading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    renderWithProvider(<ManageProfileView />, { state });

    expect(
      screen.getByTestId(ManageProfileViewSelectorsIDs.TRADING_ACTIVITY_ROW),
    ).toHaveTextContent(
      new RegExp(
        strings('social_leaderboard.manage_profile.trading_activity_off'),
      ),
    );
  });

  it('navigates to the display name editor', () => {
    renderWithProvider(<ManageProfileView />, { state });

    fireEvent.press(
      screen.getByTestId(ManageProfileViewSelectorsIDs.DISPLAY_NAME_ROW),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.MANAGE_PROFILE_TEXT_EDITOR,
      { field: 'displayName' },
    );
  });

  it('does not open the handle editor once the handle is set', () => {
    renderWithProvider(<ManageProfileView />, { state });

    const row = screen.getByTestId(ManageProfileViewSelectorsIDs.HANDLE_ROW);
    fireEvent.press(row);

    expect(row.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to the handle editor while no handle is set', () => {
    mockUseMyProfile.mockReturnValue({
      profile: { ...profile, handle: '' },
      isLoading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    renderWithProvider(<ManageProfileView />, { state });

    fireEvent.press(
      screen.getByTestId(ManageProfileViewSelectorsIDs.HANDLE_ROW),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.MANAGE_PROFILE_TEXT_EDITOR,
      { field: 'handle' },
    );
  });

  it('navigates to the bio editor', () => {
    renderWithProvider(<ManageProfileView />, { state });

    fireEvent.press(screen.getByTestId(ManageProfileViewSelectorsIDs.BIO_ROW));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.MANAGE_PROFILE_TEXT_EDITOR,
      { field: 'bio' },
    );
  });

  describe('socials row', () => {
    const pressSocials = async () => {
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(ManageProfileViewSelectorsIDs.SOCIALS_ROW),
        );
      });
    };

    it('opens the X account screen when X is connected', async () => {
      renderWithProvider(<ManageProfileView />, { state });

      await pressSocials();

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SOCIAL_PROFILE.X_ACCOUNT,
      );
      expect(mockConnect).not.toHaveBeenCalled();
    });

    it('starts X OAuth when X is not connected', async () => {
      mockUseXAuth.mockReturnValue(xAuthResult({ isConnected: false }));
      mockUseMyProfile.mockReturnValue({
        profile: { ...profile, xHandle: null, connectedToX: false },
        isLoading: false,
        error: null,
        refresh: jest.fn().mockResolvedValue(undefined),
      });

      renderWithProvider(<ManageProfileView />, { state });

      const row = screen.getByTestId(ManageProfileViewSelectorsIDs.SOCIALS_ROW);
      expect(row.props.accessibilityState).toEqual({ disabled: false });

      await pressSocials();

      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('ignores presses while connecting', async () => {
      mockUseXAuth.mockReturnValue(
        xAuthResult({ isConnected: false, isConnecting: true }),
      );

      renderWithProvider(<ManageProfileView />, { state });

      await pressSocials();

      expect(mockConnect).not.toHaveBeenCalled();
    });

    it('shows nothing when the user cancels X OAuth', () => {
      mockUseXAuth.mockReturnValue(
        xAuthResult({
          isConnected: false,
          connectError: new XAuthError(
            XAuthErrorType.UserCancelled,
            'cancelled',
          ),
        }),
      );

      renderWithProvider(<ManageProfileView />, { state });

      expect(
        screen.queryByText(
          strings('social_leaderboard.profile_onboarding.connect_x_error'),
        ),
      ).toBeNull();
    });

    it('shows a connect error when X OAuth fails', () => {
      mockUseXAuth.mockReturnValue(
        xAuthResult({
          isConnected: false,
          connectError: new XAuthError(XAuthErrorType.BackendError, 'boom'),
        }),
      );

      renderWithProvider(<ManageProfileView />, { state });

      expect(
        screen.getByText(
          strings('social_leaderboard.profile_onboarding.connect_x_error'),
        ),
      ).toBeOnTheScreen();
    });

    describe('connect error announcement', () => {
      let announceSpy: jest.SpyInstance;

      beforeEach(() => {
        announceSpy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
      });

      afterEach(() => {
        announceSpy.mockRestore();
      });

      it('exposes the connect error as a polite alert', () => {
        mockUseXAuth.mockReturnValue(
          xAuthResult({
            isConnected: false,
            connectError: new XAuthError(XAuthErrorType.BackendError, 'boom'),
          }),
        );

        renderWithProvider(<ManageProfileView />, { state });

        expect(
          screen.getByTestId(ManageProfileViewSelectorsIDs.X_CONNECT_ERROR)
            .props,
        ).toEqual(
          expect.objectContaining({
            accessibilityRole: 'alert',
            accessibilityLiveRegion: 'polite',
          }),
        );
      });

      it('announces the connect error when it appears', () => {
        mockUseXAuth.mockReturnValue(xAuthResult({ isConnected: false }));

        const { rerender } = renderWithProvider(<ManageProfileView />, {
          state,
        });

        expect(announceSpy).not.toHaveBeenCalled();

        mockUseXAuth.mockReturnValue(
          xAuthResult({
            isConnected: false,
            connectError: new XAuthError(
              XAuthErrorType.NetworkFailure,
              'offline',
            ),
          }),
        );
        rerender(<ManageProfileView />);

        expect(announceSpy).toHaveBeenCalledWith(
          strings('social_leaderboard.profile_onboarding.connect_x_error'),
        );
      });

      it('does not announce when the user cancels X OAuth', () => {
        mockUseXAuth.mockReturnValue(
          xAuthResult({
            isConnected: false,
            connectError: new XAuthError(
              XAuthErrorType.UserCancelled,
              'cancelled',
            ),
          }),
        );

        renderWithProvider(<ManageProfileView />, { state });

        expect(announceSpy).not.toHaveBeenCalled();
      });
    });

    it('shows the X username from the controller before the profile refetches', () => {
      mockUseXAuth.mockReturnValue(
        xAuthResult({ xProfile: { ...xProfile, username: 'fresh-handle' } }),
      );
      mockUseMyProfile.mockReturnValue({
        profile: { ...profile, xHandle: null, connectedToX: false },
        isLoading: false,
        error: null,
        refresh: jest.fn().mockResolvedValue(undefined),
      });

      renderWithProvider(<ManageProfileView />, { state });

      expect(
        screen.getByTestId(ManageProfileViewSelectorsIDs.SOCIALS_ROW),
      ).toHaveTextContent(/X @fresh-handle/);
    });
  });

  it('navigates to trading activity', () => {
    renderWithProvider(<ManageProfileView />, { state });

    fireEvent.press(
      screen.getByTestId(ManageProfileViewSelectorsIDs.TRADING_ACTIVITY_ROW),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.MANAGE_PROFILE_TRADING_ACTIVITY,
    );
  });

  it('shows the linked account name on the linked social account row', () => {
    renderWithProvider(<ManageProfileView />, { state });

    expect(
      screen.getByTestId(ManageProfileViewSelectorsIDs.LINKED_ACCOUNT_ROW),
    ).toHaveTextContent(/Trading Account/);
    expect(
      screen.getByTestId(ManageProfileViewSelectorsIDs.LINKED_ACCOUNT_AVATAR),
    ).toBeOnTheScreen();
  });

  it('shows the short linked address when the account is not in the wallet', () => {
    mockUseLinkableSocialAccounts.mockReturnValue([]);

    renderWithProvider(<ManageProfileView />, { state });

    expect(
      screen.getByTestId(ManageProfileViewSelectorsIDs.LINKED_ACCOUNT_ROW),
    ).toHaveTextContent(new RegExp(renderShortAddress(MOCK_ADDRESS_2)));
    expect(
      screen.queryByTestId(ManageProfileViewSelectorsIDs.LINKED_ACCOUNT_AVATAR),
    ).not.toBeOnTheScreen();
  });

  it('navigates to the linked social account picker', () => {
    renderWithProvider(<ManageProfileView />, { state });

    fireEvent.press(
      screen.getByTestId(ManageProfileViewSelectorsIDs.LINKED_ACCOUNT_ROW),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.MANAGE_PROFILE_LINKED_ACCOUNT,
    );
  });

  it('opens the avatar picker from the avatar and pencil', () => {
    renderWithProvider(<ManageProfileView />, { state });

    fireEvent.press(screen.getByTestId(ManageProfileViewSelectorsIDs.AVATAR));

    expect(
      screen.getByTestId(ManageProfileViewSelectorsIDs.EDIT_AVATAR_BUTTON, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.EDIT_AVATAR);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('disables editor rows when no controller profile exists', () => {
    mockUseMyProfile.mockReturnValue({
      profile: null,
      isLoading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    mockUseProfileController.mockReturnValue(
      controllerResult({ isControllerBacked: false }),
    );

    renderWithProvider(<ManageProfileView />, { state });

    fireEvent.press(
      screen.getByTestId(ManageProfileViewSelectorsIDs.DISPLAY_NAME_ROW),
    );
    fireEvent.press(
      screen.getByTestId(ManageProfileViewSelectorsIDs.TRADING_ACTIVITY_ROW),
    );
    fireEvent.press(
      screen.getByTestId(ManageProfileViewSelectorsIDs.SOCIALS_ROW),
    );
    fireEvent.press(screen.getByTestId(ManageProfileViewSelectorsIDs.AVATAR));
    fireEvent.press(
      screen.getByTestId(ManageProfileViewSelectorsIDs.EDIT_AVATAR_BUTTON, {
        includeHiddenElements: true,
      }),
    );

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('returns to My Profile from the back button', () => {
    renderWithProvider(<ManageProfileView />, { state });

    fireEvent.press(
      screen.getByTestId(ManageProfileViewSelectorsIDs.BACK_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
