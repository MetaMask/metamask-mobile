import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import SecuritySettings from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectUseSafeChainsListValidation } from '../../../../selectors/preferencesController';
import { USE_SAFE_CHAINS_LIST_VALIDATION } from '../../Settings/SecuritySettings/SecuritySettings.constants';
import { strings } from '../../../../../locales/i18n';
import { toggleUseSafeChainsListValidation } from '../../../../util/networks';

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
    jest.clearAllMocks();
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

  it('should render the Network Details Check section', () => {
    const { getByTestId } = renderWithProvider(<SecuritySettings />);
    expect(getByTestId(USE_SAFE_CHAINS_LIST_VALIDATION)).toBeTruthy();
  });

  it('should display correct title for Network Details Check', () => {
    const { getByText } = renderWithProvider(<SecuritySettings />);
    expect(getByText(strings('wallet.network_details_check'))).toBeTruthy();
  });

  it('should render the switch for Network Details Check', () => {
    useSelector.mockImplementation((selector) => {
      if (selector === selectUseSafeChainsListValidation) return false;
      return null;
    });
    const { getByTestId } = renderWithProvider(<SecuritySettings />);
    const switchElement = getByTestId(USE_SAFE_CHAINS_LIST_VALIDATION);
    expect(switchElement).toBeTruthy();
  });

  it('should toggle the switch when pressed', () => {
    useSelector.mockImplementation((selector) => {
      if (selector === selectUseSafeChainsListValidation) return false;
      return null;
    });
    const { getByTestId } = renderWithProvider(<SecuritySettings />);
    const switchElement = getByTestId(USE_SAFE_CHAINS_LIST_VALIDATION);
    fireEvent(switchElement, 'onValueChange', true);
    expect(toggleUseSafeChainsListValidation).toHaveBeenCalled();
  });

  it('should display the correct switch state based on useSafeChainsListValidation', () => {
    useSelector.mockImplementation((selector) => {
      if (selector === selectUseSafeChainsListValidation) return true;
      return null;
    });
    const { getByTestId } = renderWithProvider(<SecuritySettings />);
    const switchElement = getByTestId(USE_SAFE_CHAINS_LIST_VALIDATION);
    expect(switchElement.props.value).toBe(true);
  });
});
