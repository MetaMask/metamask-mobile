import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WalletRecoveryLoading from './WalletRecoveryLoading';
import { WalletRecoverySelectorsIDs } from './WalletRecovery.testIds';

describe('WalletRecoveryLoading', () => {
  it('renders a blank centered loading hold', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <WalletRecoveryLoading />,
    );

    expect(
      getByTestId(WalletRecoverySelectorsIDs.LOADING_SCREEN),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(WalletRecoverySelectorsIDs.LOADING_MESSAGE),
    ).toBeNull();
  });

  it('shows an explanation when message is provided', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <WalletRecoveryLoading message="Confirm with your passkey to recover your wallet" />,
    );

    expect(
      getByTestId(WalletRecoverySelectorsIDs.LOADING_MESSAGE),
    ).toBeOnTheScreen();
    expect(
      getByText('Confirm with your passkey to recover your wallet'),
    ).toBeOnTheScreen();
  });
});
