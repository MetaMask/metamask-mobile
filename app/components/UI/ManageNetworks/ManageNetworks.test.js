// Third party dependencies.
import React from 'react';
import { Linking } from 'react-native';
// Internal dependencies.
import ManageNetworks from './ManageNetworks';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectNetworkName } from '../../../selectors/networkInfos';
import AppConstants from '../../../core/AppConstants';
import { fireEvent } from '@testing-library/react-native';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockNetworkName = 'Ethereum Main Network';

describe('ManageNetworks', () => {
  it('should render correctly', () => {
    useSelector.mockImplementation((selector) => {
      if (selector === selectNetworkName) return mockNetworkName;
    });
    const { toJSON } = renderWithProvider(
      <ManageNetworks navigation={useNavigation()} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it.each([
    [
      {
        link: AppConstants.URLS.PRIVACY_POLICY_2024,
        testId: 'privacy-policy-link',
      },
      {
        link: AppConstants.URLS.ADD_SOLANA_ACCOUNT_PRIVACY_POLICY,
        testId: 'solana-privacy-policy-link',
      },
    ],
  ])('opens link %link', ({ link, testId }) => {
    useSelector.mockImplementation((selector) => {
      if (selector === selectNetworkName) return mockNetworkName;
    });
    const { getByTestId } = renderWithProvider(
      <ManageNetworks navigation={useNavigation()} />,
    );
    const button = getByTestId(testId);
    fireEvent.press(button);
    expect(Linking.openURL).toHaveBeenCalledWith(link);
  });
});
