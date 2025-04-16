import React from 'react';
import {
  generateContractInteractionState,
  personalSignatureConfirmationState,
  siweSignatureConfirmationState,
  typedSignV4ConfirmationState,
  typedSignV4NFTConfirmationState,
} from '../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Title from './title';

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

  it('renders correct title and subtitle for personal sign request', () => {
    const { getByText } = renderWithProvider(<Title />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Signature request')).toBeTruthy();
    expect(
      getByText('Review request details before you confirm.'),
    ).toBeTruthy();
  });

  it('renders correct title and subtitle for personal siwe request', () => {
    const { getByText } = renderWithProvider(<Title />, {
      state: siweSignatureConfirmationState,
    });
    expect(getByText('Sign-in request')).toBeTruthy();
    expect(
      getByText('A site wants you to sign in to prove you own this account.'),
    ).toBeTruthy();
  });

  it('renders correct title and subtitle for contract interaction', () => {
    const { getByText } = renderWithProvider(<Title />, {
      state: generateContractInteractionState,
    });
    expect(getByText('Transaction request')).toBeTruthy();
    expect(
      getByText('Review request details before you confirm.'),
    ).toBeTruthy();
  });
});
