import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WalletRecoveryLoading from './WalletRecoveryLoading';
import { WalletRecoverySelectorsIDs } from './WalletRecovery.testIds';

describe('WalletRecoveryLoading', () => {
  it('renders a blank centered loading hold', () => {
    const { getByTestId } = renderWithProvider(
      <WalletRecoveryLoading onBack={jest.fn()} />,
    );

    expect(
      getByTestId(WalletRecoverySelectorsIDs.LOADING_SCREEN),
    ).toBeOnTheScreen();
  });
});
