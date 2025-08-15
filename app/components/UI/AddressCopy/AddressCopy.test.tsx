import React from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';

import AddressCopy from './AddressCopy';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { createMockInternalAccount } from '../../../util/test/accountsControllerTestUtils';

// Mock navigation before importing renderWithProvider
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

const renderWithAddressCopy = (account: InternalAccount) =>
  renderWithProvider(<AddressCopy account={account} />);

describe('AddressCopy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly the component', () => {
    const component = renderWithAddressCopy(
      createMockInternalAccount('0xaddress', 'Account 1'),
    );
    expect(component).toBeDefined();
    expect(
      component.getByTestId(WalletViewSelectorsIDs.ACCOUNT_COPY_BUTTON),
    ).toBeDefined();
  });
});
