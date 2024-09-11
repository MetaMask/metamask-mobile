import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DefaultSettings from './';
import { strings } from '../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

describe('DefaultSettings', () => {
  const mockNavigation = {
    goBack: jest.fn(),
    setOptions: jest.fn(),
    navigate: jest.fn(),
  };

  beforeEach(() => {
    useNavigation.mockReturnValue(mockNavigation);
  });

  it('renders correctly', () => {
    const { getByText } = render(<DefaultSettings />);
    expect(
      getByText(strings('default_settings.description'), { exact: false }),
    ).toBeTruthy();
  });

  it('sets navigation options', () => {
    render(<DefaultSettings />);
    expect(mockNavigation.setOptions).toHaveBeenCalled();
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = render(<DefaultSettings />);
    const backButton = getByTestId('back-button');
    fireEvent.press(backButton);
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('opens privacy best practices link when "Learn more" is pressed', () => {
    const { getByText } = render(<DefaultSettings />);
    const learnMoreText = getByText(
      strings('default_settings.learn_more_about_privacy'),
    );
    fireEvent.press(learnMoreText);
    expect(Linking.openURL).toHaveBeenCalledWith(
      AppConstants.URLS.PRIVACY_BEST_PRACTICES,
    );
  });

  it('navigates to General Settings when pressed', () => {
    const { getByText } = render(<DefaultSettings />);
    const generalSettingsDrawer = getByText(
      strings('default_settings.drawer_general_title'),
    );
    fireEvent.press(generalSettingsDrawer);
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.ONBOARDING.GENERAL_SETTINGS,
    );
  });

  it('navigates to Assets Settings when pressed', () => {
    const { getByText } = render(<DefaultSettings />);
    const assetsSettingsDrawer = getByText(
      strings('default_settings.drawer_assets_title'),
    );
    fireEvent.press(assetsSettingsDrawer);
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.ONBOARDING.ASSETS_SETTINGS,
    );
  });

  it('navigates to Security Settings when pressed', () => {
    const { getByText } = render(<DefaultSettings />);
    const securitySettingsDrawer = getByText(
      strings('default_settings.drawer_security_title'),
    );
    fireEvent.press(securitySettingsDrawer);
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.ONBOARDING.SECURITY_SETTINGS,
    );
  });
});
