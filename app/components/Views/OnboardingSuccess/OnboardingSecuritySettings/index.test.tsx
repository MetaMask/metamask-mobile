import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { selectUseSafeChainsListValidation } from '../../../../selectors/preferencesController';
import OnboardingSecuritySettings from './';

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

describe('OnboardingSecuritySettings', () => {
  const mockNavigation = {
    goBack: jest.fn(),
    setOptions: jest.fn(),
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
  });

  it('should render correctly', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectUseSafeChainsListValidation) return false;
      return null;
    });
    const { toJSON } = renderWithProvider(<OnboardingSecuritySettings />);
    expect(toJSON()).toMatchSnapshot();
  });
});
