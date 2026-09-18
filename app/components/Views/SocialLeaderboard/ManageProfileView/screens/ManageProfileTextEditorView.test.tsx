import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type { UseMyProfileResult } from '../../MyProfileView/hooks/useMyProfile';
import { ManageProfileEditorSelectorsIDs } from '../ManageProfileView.testIds';
import type { ManageProfileTextEditorField } from './manageProfileTextEditorFields';
import ManageProfileTextEditorView from './ManageProfileTextEditorView';

const mockGoBack = jest.fn();
const mockUseRoute = jest.fn<
  { params: { field: ManageProfileTextEditorField } },
  []
>();
const mockUseMyProfile = jest.fn<UseMyProfileResult, []>();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => mockUseRoute(),
}));

jest.mock('../../MyProfileView/hooks/useMyProfile', () => ({
  useMyProfile: () => mockUseMyProfile(),
}));

describe('ManageProfileTextEditorView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMyProfile.mockReturnValue({
      profile: {
        profileId: 'current-user',
        displayName: 'Giga Whale',
        handle: 'giga-whale.metamask',
        shareUrl: 'https://metamask.io/social/giga-whale',
      },
      isLoading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
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
});
