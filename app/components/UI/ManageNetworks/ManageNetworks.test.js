import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import ManageNetworks from './ManageNetworks';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { selectNetworkName } from '../../../selectors/networkInfos';
import AppConstants from '../../../core/AppConstants';
import Routes from '../../../constants/navigation/Routes';
import { ConnectedAccountsSelectorsIDs } from '../../Views/MultichainAccounts/shared/ConnectedAccountModal.testIds';

const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockBuild = jest
  .fn()
  .mockReturnValue({ name: 'NETWORK_SELECTOR_PRESSED' });
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  build: mockBuild,
});

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockNetworkName = 'Ethereum Main Network';

const mockUseSelectorWithNetworkName = () => {
  useSelector.mockImplementation((selector) => {
    if (selector === selectNetworkName) {
      return mockNetworkName;
    }

    return undefined;
  });
};

describe('ManageNetworks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelectorWithNetworkName();
  });

  it('renders the current network on the select button', () => {
    const { getByTestId, getByText } = renderWithProvider(<ManageNetworks />);

    expect(
      getByTestId(ConnectedAccountsSelectorsIDs.NETWORK_PICKER),
    ).toBeOnTheScreen();
    expect(getByText(mockNetworkName)).toBeOnTheScreen();
  });

  it('opens the network selector when the select button is pressed', () => {
    const { getByTestId } = renderWithProvider(<ManageNetworks />);

    fireEvent.press(getByTestId(ConnectedAccountsSelectorsIDs.NETWORK_PICKER));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.NETWORK_SELECTOR,
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(mockBuild());
  });

  it.each([
    {
      link: AppConstants.URLS.PRIVACY_POLICY_2024,
      testId: 'privacy-policy-link',
    },
    {
      link: AppConstants.URLS.ADD_SOLANA_ACCOUNT_PRIVACY_POLICY,
      testId: 'solana-privacy-policy-link',
    },
  ])('opens $testId', ({ link, testId }) => {
    const { getByTestId } = renderWithProvider(<ManageNetworks />);

    fireEvent.press(getByTestId(testId));

    expect(Linking.openURL).toHaveBeenCalledWith(link);
  });
});
