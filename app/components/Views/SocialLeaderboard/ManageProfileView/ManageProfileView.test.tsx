import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Routes from '../../../../constants/navigation/Routes';
import type { UseMyProfileResult } from '../MyProfileView/hooks/useMyProfile';
import ManageProfileView from './ManageProfileView';
import { ManageProfileViewSelectorsIDs } from './ManageProfileView.testIds';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockUseMyProfile = jest.fn<UseMyProfileResult, []>();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
}));

jest.mock('../MyProfileView/hooks/useMyProfile', () => ({
  useMyProfile: () => mockUseMyProfile(),
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
  followerCount: 0,
  followingCount: 0,
  shareUrl: 'https://metamask.io/social/giga-whale',
};

const state = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

describe('ManageProfileView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMyProfile.mockReturnValue({
      profile,
      isLoading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });
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

  it('navigates to the socials editor', () => {
    renderWithProvider(<ManageProfileView />, { state });

    fireEvent.press(
      screen.getByTestId(ManageProfileViewSelectorsIDs.SOCIALS_ROW),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.MANAGE_PROFILE_TEXT_EDITOR,
      { field: 'socials' },
    );
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

  it('shows the selected wallet account on the linked social account row', () => {
    renderWithProvider(<ManageProfileView />, { state });

    expect(
      screen.getByTestId(ManageProfileViewSelectorsIDs.LINKED_ACCOUNT_ROW),
    ).toHaveTextContent(/Account 2/);
    expect(
      screen.getByTestId(ManageProfileViewSelectorsIDs.LINKED_ACCOUNT_AVATAR),
    ).toBeOnTheScreen();
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

  it('returns to My Profile from the back button', () => {
    renderWithProvider(<ManageProfileView />, { state });

    fireEvent.press(
      screen.getByTestId(ManageProfileViewSelectorsIDs.BACK_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
