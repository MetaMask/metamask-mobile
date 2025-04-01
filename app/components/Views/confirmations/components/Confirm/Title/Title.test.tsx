import { TransactionStatus, TransactionType } from '@metamask/transaction-controller';
import React from 'react';
import {
  generateContractInteractionState,
  personalSignatureConfirmationState,
  siweSignatureConfirmationState,
  typedSignV4ConfirmationState,
  typedSignV4NFTConfirmationState,
} from '../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as TransactionMetadataRequestHook from '../../../hooks/useTransactionMetadataRequest';
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

  it('renders correct title and subtitle for personal sign request', () => {
    const { getByText } = renderWithProvider(<Title />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Signature request')).toBeTruthy();
    expect(
      getByText('Review request details before you confirm.'),
    ).toBeTruthy();
  });

  it('should render correct title and subtitle for personal siwe request', () => {
    const { getByText } = renderWithProvider(<Title />, {
      state: siweSignatureConfirmationState,
    });
    expect(getByText('Sign-in request')).toBeTruthy();
    expect(
      getByText('A site wants you to sign in to prove you own this account.'),
    ).toBeTruthy();
  });

  it('should render correct title and subtitle for contract interaction', () => {
    jest.spyOn(TransactionMetadataRequestHook, 'useTransactionMetadataRequest').mockReturnValue({
      id: '7e62bcb1-a4e9-11ef-9b51-ddf21c91a998',
      type: TransactionType.contractInteraction,
      txParams: {
        data: '0x123456',
        from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
        to: '0x1234567890123456789012345678901234567890',
        value: '0x0',
      },
      chainId: '0x1' as `0x${string}`,
      networkClientId: 'mainnet',
      status: TransactionStatus.unapproved,
      time: Date.now(),
      origin: 'https://metamask.github.io',
    });

    const { getByText } = renderWithProvider(<Title />, {
      state: generateContractInteractionState,
    });
    expect(getByText('Transaction request')).toBeTruthy();
    expect(
      getByText('Review request details before you confirm.'),
    ).toBeTruthy();
  });
});
