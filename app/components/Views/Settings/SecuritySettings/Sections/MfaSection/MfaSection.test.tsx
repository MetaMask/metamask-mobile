import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectMfaUiKitEnabled } from '../../../../../../selectors/featureFlagController/mfaUiKit';
import { SecurityPrivacyViewSelectorsIDs } from '../../SecurityPrivacyView.testIds';
import MfaSection from './MfaSection';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../../selectors/featureFlagController/mfaUiKit', () => ({
  selectMfaUiKitEnabled: jest.fn(),
}));

const mockIsMfaUiKitEnabled = jest.mocked(selectMfaUiKitEnabled);

describe('MfaSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the MFA settings', () => {
    mockIsMfaUiKitEnabled.mockReturnValue(true);
    const { getByTestId } = renderWithProvider(<MfaSection />, { state: {} });

    fireEvent.press(getByTestId(SecurityPrivacyViewSelectorsIDs.MFA_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MFA.SETTINGS);
  });

  it('renders nothing when the flag is off', () => {
    mockIsMfaUiKitEnabled.mockReturnValue(false);
    const { queryByTestId } = renderWithProvider(<MfaSection />, {
      state: {},
    });

    expect(
      queryByTestId(SecurityPrivacyViewSelectorsIDs.MFA_SECTION),
    ).toBeNull();
  });
});
