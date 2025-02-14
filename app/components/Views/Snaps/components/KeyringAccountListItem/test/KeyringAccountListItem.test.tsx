import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import KeyringAccountListItem from '../KeyringAccountListItem';
import { Linking } from 'react-native';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { KEYRING_ACCOUNT_LIST_ITEM, KEYRING_ACCOUNT_LIST_ITEM_BUTTON } from '../KeyringAccountListItem.constants';
import { MOCK_ADDRESS_1, createMockSnapInternalAccount } from '../../../../../../util/test/accountsControllerTestUtils';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

describe('KeyringAccountListItem', () => {

  const mockInternalAccount = createMockSnapInternalAccount(
    MOCK_ADDRESS_1,
    'Snap Account 1',
  );

  const mockBlockExplorerUrl = `https://etherscan.io/address/${MOCK_ADDRESS_1.toLowerCase()}`;

  it('renders correctly', () => {
    const { getByTestId, getByText } = render(
      <KeyringAccountListItem account={mockInternalAccount} blockExplorerUrl={mockBlockExplorerUrl} />,
    );

    expect(getByTestId(KEYRING_ACCOUNT_LIST_ITEM)).toBeTruthy();
    expect(getByText('Snap Account 1')).toBeTruthy();
    expect(getByText(toChecksumHexAddress(MOCK_ADDRESS_1))).toBeTruthy();
  });

  it('opens snap URL when export button is pressed', () => {
    const { getByTestId } = render(
      <KeyringAccountListItem account={mockInternalAccount} blockExplorerUrl={mockBlockExplorerUrl} />,
    );

    const exportButton = getByTestId(KEYRING_ACCOUNT_LIST_ITEM_BUTTON);
    fireEvent.press(exportButton);

    expect(Linking.openURL).toHaveBeenCalledWith(mockBlockExplorerUrl);
  });
});
