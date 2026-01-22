import React from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';

import AddressCopy from './AddressCopy';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { createMockInternalAccount } from '../../../util/test/accountsControllerTestUtils';
import { ToastContext } from '../../../component-library/components/Toast';

// Mock navigation before importing renderWithProvider
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: mockCloseToast },
};

const renderWithAddressCopy = (account: InternalAccount) =>
  renderWithProvider(
    <ToastContext.Provider value={{ toastRef: mockToastRef }}>
      <AddressCopy account={account} />
    </ToastContext.Provider>,
  );

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
