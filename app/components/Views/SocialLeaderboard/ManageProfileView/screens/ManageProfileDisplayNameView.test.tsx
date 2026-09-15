import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type { UseMyProfileResult } from '../../MyProfileView/hooks/useMyProfile';
import { ManageProfileEditorSelectorsIDs } from '../ManageProfileView.testIds';
import ManageProfileDisplayNameView from './ManageProfileDisplayNameView';

const mockGoBack = jest.fn();
const mockUseMyProfile = jest.fn<UseMyProfileResult, []>();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../../MyProfileView/hooks/useMyProfile', () => ({
  useMyProfile: () => mockUseMyProfile(),
}));

describe('ManageProfileDisplayNameView', () => {
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

  it('keeps Save disabled after the field is edited', () => {
    renderWithProvider(<ManageProfileDisplayNameView />);

    fireEvent.changeText(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.DISPLAY_NAME_INPUT),
      'Laser Gains',
    );

    expect(
      screen.getByTestId(ManageProfileEditorSelectorsIDs.DISPLAY_NAME_SAVE),
    ).toBeDisabled();
  });
});
