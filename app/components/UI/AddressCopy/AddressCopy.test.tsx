import React from 'react';

import AddressCopy from './AddressCopy';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';
import renderWithProvider from '../../../util/test/renderWithProvider';

// Mock navigation before importing renderWithProvider
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

const renderAddressCopy = () => renderWithProvider(<AddressCopy />);

describe('AddressCopy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the copy button', () => {
    const { getByTestId } = renderAddressCopy();

    expect(
      getByTestId(WalletViewSelectorsIDs.ACCOUNT_COPY_BUTTON),
    ).toBeDefined();
  });
});
