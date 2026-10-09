import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import Routes from '../../../../../../constants/navigation/Routes';
import { isMfaKitEnabled } from '../../../../../../util/identity/mfa';
import { SecurityPrivacyViewSelectorsIDs } from '../../SecurityPrivacyView.testIds';
import MfaSection from './MfaSection';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../../util/identity/mfa', () => ({
  isMfaKitEnabled: jest.fn(),
}));

const mockIsMfaKitEnabled = jest.mocked(isMfaKitEnabled);

describe('MfaSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the MFA settings', () => {
    mockIsMfaKitEnabled.mockReturnValue(true);
    const { getByTestId } = renderWithProvider(<MfaSection />, { state: {} });

    fireEvent.press(getByTestId(SecurityPrivacyViewSelectorsIDs.MFA_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MFA.SETTINGS);
  });

  it('renders nothing when the kit is disabled', () => {
    mockIsMfaKitEnabled.mockReturnValue(false);
    const { queryByTestId } = renderWithProvider(<MfaSection />, {
      state: {},
    });

    expect(
      queryByTestId(SecurityPrivacyViewSelectorsIDs.MFA_SECTION),
    ).toBeNull();
  });
});
