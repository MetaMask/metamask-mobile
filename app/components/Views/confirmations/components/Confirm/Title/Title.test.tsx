import React from 'react';

import {
  personalSignatureConfirmationState,
  siweSignatureConfirmationState,
  typedSignV4ConfirmationState,
  typedSignV4NFTConfirmationState,
} from '../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import Title from './Title';

describe('Confirm Title', () => {
  it('renders the title and subtitle for a permit signature', () => {
    const { getByText } = renderWithProvider(<Title />, {
      state: typedSignV4ConfirmationState,
    });

    expect(getByText('Spending cap request')).toBeTruthy();
    expect(
      getByText('This site wants permission to spend your tokens.'),
    ).toBeTruthy();
  });

  it('renders the title and subtitle for a permit NFT signature', () => {
    const { getByText } = renderWithProvider(<Title />, {
      state: typedSignV4NFTConfirmationState,
    });

    expect(getByText('Withdrawal request')).toBeTruthy();
    expect(
      getByText('This site wants permission to withdraw your NFTs.'),
    ).toBeTruthy();
  });

  it('renders correct title and subtitle for personal sign request', async () => {
    const { getByText } = renderWithProvider(<Title />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Signature request')).toBeDefined();
    expect(
      getByText('Review request details before you confirm.'),
    ).toBeDefined();
  });

  it('should render correct title and subtitle for personal siwe request', async () => {
    const { getByText } = renderWithProvider(<Title />, {
      state: siweSignatureConfirmationState,
    });
    expect(getByText('Sign-in request')).toBeDefined();
    expect(
      getByText('A site wants you to sign in to prove you own this account.'),
    ).toBeDefined();
  });
});
