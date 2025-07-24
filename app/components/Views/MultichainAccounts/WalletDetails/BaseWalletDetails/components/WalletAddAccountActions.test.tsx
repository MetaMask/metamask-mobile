import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import WalletAddAccountActions from './WalletAddAccountActions';

// Mock dependencies
jest.mock('../../../../../../core/SnapKeyring/MultichainWalletSnapClient');
jest.mock('../../../../../../core/SnapKeyring/utils/getMultichainAccountName');
jest.mock('../../../../../../util/Logger');
jest.mock('../../../../../../actions/multiSrp');

const mockOnBack = jest.fn();

describe('WalletAddAccountActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with Ethereum and Solana options', () => {
    const { getByText } = renderWithProvider(
      <WalletAddAccountActions keyringId="keyring:1" onBack={mockOnBack} />,
    );
    expect(getByText('Create a new account')).toBeTruthy();
    expect(getByText('Ethereum account')).toBeTruthy();
    expect(getByText('Solana account')).toBeTruthy();
  });

  it('calls onBack when back button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <WalletAddAccountActions keyringId="keyring:1" onBack={mockOnBack} />,
    );

    const backButton = getByTestId('sheet-header-back-button');
    fireEvent.press(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('handles Ethereum account button press', () => {
    const { getByText } = renderWithProvider(
      <WalletAddAccountActions keyringId="keyring:1" onBack={mockOnBack} />,
    );

    const ethereumButton = getByText('Ethereum account');
    fireEvent.press(ethereumButton);

    // Button should be pressable (no error thrown)
    expect(ethereumButton).toBeTruthy();
  });

  it('handles Solana account button press', () => {
    const { getByText } = renderWithProvider(
      <WalletAddAccountActions keyringId="keyring:1" onBack={mockOnBack} />,
    );

    const solanaButton = getByText('Solana account');
    fireEvent.press(solanaButton);

    // Button should be pressable (no error thrown)
    expect(solanaButton).toBeTruthy();
  });
});
