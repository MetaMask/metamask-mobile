import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import SecuritySettings from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectUseSafeChainsListValidation } from '../../../../selectors/preferencesController';
import { USE_SAFE_CHAINS_LIST_VALIDATION } from '../../Settings/SecuritySettings/SecuritySettings.constants';
import { strings } from '../../../../../locales/i18n';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../util/networks', () => ({
  toggleUseSafeChainsListValidation: jest.fn(),
}));

describe('SecuritySettings', () => {
  const mockNavigation = {
    goBack: jest.fn(),
    setOptions: jest.fn(),
    navigate: jest.fn(),
  };

  beforeEach(() => {
    useNavigation.mockReturnValue(mockNavigation);
  });

  it('should render correctly', () => {
    useSelector.mockImplementation((selector) => {
      if (selector === selectUseSafeChainsListValidation) return false;
      return null;
    });
    const { toJSON } = renderWithProvider(<SecuritySettings />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should set navigation options', () => {
    renderWithProvider(<SecuritySettings />);
    expect(mockNavigation.setOptions).toHaveBeenCalled();
  });

  it('navigates back when back button is pressed', () => {
    const backButton = mockNavigation.setOptions.mock.calls[0][0].headerLeft();
    fireEvent.press(backButton);
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('should render the Network Details Check section', () => {
    const { getByTestId } = renderWithProvider(<SecuritySettings />);
    expect(getByTestId(USE_SAFE_CHAINS_LIST_VALIDATION)).toBeTruthy();
  });

  it('should display correct title for Network Details Check', () => {
    const { getByText } = renderWithProvider(<SecuritySettings />);
    expect(getByText(strings('wallet.network_details_check'))).toBeTruthy();
  });
});
