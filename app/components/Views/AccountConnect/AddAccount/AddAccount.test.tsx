import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import AddAccountSelection from './AddAccount';
import { WalletClientType } from '../../../../core/SnapKeyring/MultichainWalletSnapClient';
import { SolScope } from '@metamask/keyring-api';
import { SHEET_HEADER_BACK_BUTTON_ID } from '../../../../component-library/components/Sheet/SheetHeader/SheetHeader.constants';

describe('AddAccountSelection', () => {
  const mockOnBack = jest.fn();
  const mockOnCreateAccount = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText } = renderWithProvider(
      <AddAccountSelection
        onBack={mockOnBack}
        onCreateAccount={mockOnCreateAccount}
      />,
    );

    expect(getByText('Connect accounts')).toBeTruthy();
    expect(getByText('Create a new account')).toBeTruthy();
    expect(getByText('Ethereum account')).toBeTruthy();
    expect(getByText('Solana account')).toBeTruthy();
  });

  it('calls onBack when back button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <AddAccountSelection
        onBack={mockOnBack}
        onCreateAccount={mockOnCreateAccount}
      />,
    );

    const backButton = getByTestId(SHEET_HEADER_BACK_BUTTON_ID);
    fireEvent.press(backButton);

    expect(mockOnBack).toHaveBeenCalled();
  });

  it('calls onCreateAccount with no parameters when Add new account is pressed', () => {
    const { getByText } = renderWithProvider(
      <AddAccountSelection
        onBack={mockOnBack}
        onCreateAccount={mockOnCreateAccount}
      />,
    );

    fireEvent.press(getByText('Ethereum account'));
    expect(mockOnCreateAccount).toHaveBeenCalledWith();
  });

  it('calls onCreateAccount with Solana parameters when Add Solana account is pressed', () => {
    const { getByText } = renderWithProvider(
      <AddAccountSelection
        onBack={mockOnBack}
        onCreateAccount={mockOnCreateAccount}
      />,
    );

    fireEvent.press(getByText('Solana account'));
    expect(mockOnCreateAccount).toHaveBeenCalledWith(
      WalletClientType.Solana,
      SolScope.Mainnet,
    );
  });
});
