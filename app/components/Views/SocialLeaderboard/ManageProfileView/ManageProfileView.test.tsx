import React from 'react';
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
  shareUrl: 'https://metamask.io/social/giga-whale',
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
    mockUseLinkableSocialAccounts.mockReturnValue([
      {
        id: 'account-2',
        name: 'Trading Account',
        address: MOCK_ADDRESS_2.toLowerCase(),
        balanceLabel: '$10.00',
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

  it('navigates to the handle editor', () => {
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

  it('disconnects X from the socials row', async () => {
    const disconnectX = jest.fn().mockResolvedValue(undefined);
    mockUseProfileController.mockReturnValue(controllerResult({ disconnectX }));

    renderWithProvider(<ManageProfileView />, { state });

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ManageProfileViewSelectorsIDs.SOCIALS_ROW),
      );
    });

    expect(disconnectX).toHaveBeenCalledWith('current-user');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('disconnects X when the account is linked but the handle failed to load', async () => {
    const disconnectX = jest.fn().mockResolvedValue(undefined);
    mockUseMyProfile.mockReturnValue({
      profile: { ...profile, xHandle: null, connectedToX: true },
      isLoading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    mockUseProfileController.mockReturnValue(controllerResult({ disconnectX }));

    renderWithProvider(<ManageProfileView />, { state });

    expect(
      screen.getByTestId(ManageProfileViewSelectorsIDs.SOCIALS_ROW),
    ).toHaveTextContent(/X/);

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ManageProfileViewSelectorsIDs.SOCIALS_ROW),
      );
    });

    expect(disconnectX).toHaveBeenCalledWith('current-user');
  });

  it('shows a save error when disconnecting X fails', async () => {
    const disconnectX = jest.fn().mockRejectedValue(new Error('network'));
    mockUseProfileController.mockReturnValue(controllerResult({ disconnectX }));

    renderWithProvider(<ManageProfileView />, { state });

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ManageProfileViewSelectorsIDs.SOCIALS_ROW),
      );
    });

    expect(disconnectX).toHaveBeenCalledWith('current-user');
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(
      screen.getByText(strings('social_leaderboard.manage_profile.save_error')),
    ).toBeOnTheScreen();
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
