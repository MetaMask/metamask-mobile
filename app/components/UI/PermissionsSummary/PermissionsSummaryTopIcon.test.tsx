import React from 'react';
import PermissionsSummaryTopIcon, {
  getConnectedNetworkPickerAccessibilityLabel,
} from './PermissionsSummaryTopIcon';
import { ConnectedAccountsSelectorsIDs } from '../../Views/AccountConnect/ConnectedAccountModal.testIds';
import renderWithProvider from '../../../util/test/renderWithProvider';

describe('getConnectedNetworkPickerAccessibilityLabel', () => {
  it('joins the site and network initials with a comma separator', () => {
    expect(
      getConnectedNetworkPickerAccessibilityLabel(
        'localhost',
        'Elysium Testnet',
      ),
    ).toBe('l, E');
  });

  it('returns only the site letter when network name is missing', () => {
    expect(getConnectedNetworkPickerAccessibilityLabel('localhost')).toBe('l');
  });
});

describe('PermissionsSummaryTopIcon', () => {
  it('sets explicit accessibility label on the connected network picker', () => {
    const { getByTestId } = renderWithProvider(
      <PermissionsSummaryTopIcon
        currentPageInformation={{
          currentEnsName: '',
          url: 'http://localhost:8085/',
          icon: { uri: 'http://localhost:8085/favicon.ico' },
        }}
        isAlreadyConnected
        showPermissionsOnly={false}
        networkName="Elysium Testnet"
        networkImageSource={{ uri: 'elysium.png' }}
        onSwitchNetwork={jest.fn()}
        containerStyle={{}}
      />,
    );

    expect(
      getByTestId(ConnectedAccountsSelectorsIDs.NETWORK_PICKER).props
        .accessibilityLabel,
    ).toBe('l, E');
  });
});
