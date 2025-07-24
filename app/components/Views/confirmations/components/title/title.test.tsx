import React from 'react';
import { merge } from 'lodash';
import { TransactionType } from '@metamask/transaction-controller';

import {
  generateContractInteractionState,
  personalSignatureConfirmationState,
  siweSignatureConfirmationState,
  typedSignV4ConfirmationState,
  typedSignV4NFTConfirmationState,
  transferConfirmationState,
  upgradeOnlyAccountConfirmation,
  getAppStateForConfirmation,
  downgradeAccountConfirmation,
  upgradeAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  approveERC20TransactionStateMock,
  revokeERC20TransactionStateMock,
  approveAllERC721TransactionStateMock,
  revokeAllERC721TransactionStateMock,
  decreaseAllowanceERC20TransactionStateMock,
} from '../../__mocks__/approve-transaction-mock';
import { useGetTokenStandardAndDetails } from '../../hooks/useGetTokenStandardAndDetails';
import { TokenStandard } from '../../types/token';
import Title from './title';

jest.mock('../../hooks/useGetTokenStandardAndDetails');

describe('Confirm Title', () => {
  const mockUseGetTokenStandardAndDetails = jest.mocked(
    useGetTokenStandardAndDetails,
  );
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetTokenStandardAndDetails.mockReturnValue({
      details: {
        standard: TokenStandard.ERC20,
        decimalsNumber: 0,
      },
      isPending: false,
    } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);
  });

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

  it('renders correct title for transfer', () => {
    const { getByText } = renderWithProvider(<Title />, {
      state: merge(transferConfirmationState, {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  origin: 'test-dapp',
                },
              ],
            },
          },
        },
      }),
    });
    expect(getByText('Transfer request')).toBeTruthy();
  });

  it('renders correct title and subtitle for upgrade smart account', () => {
    const { getByText } = renderWithProvider(<Title />, {
      state: getAppStateForConfirmation(upgradeOnlyAccountConfirmation),
    });
    expect(getByText('Account update')).toBeTruthy();
    expect(getByText("You're switching to a smart account.")).toBeTruthy();
  });

  it('renders correct title and subtitle for downgrade smart account', () => {
    const { getByText } = renderWithProvider(<Title />, {
      state: getAppStateForConfirmation(downgradeAccountConfirmation),
    });
    expect(getByText('Account update')).toBeTruthy();
    expect(
      getByText("You're switching back to a standard account (EOA)."),
    ).toBeTruthy();
  });

  it('renders correct title and subtitle for upgrade+batched confirmation', () => {
    const { getByText } = renderWithProvider(<Title />, {
      state: getAppStateForConfirmation(upgradeAccountConfirmation),
    });
    expect(getByText('Transaction request')).toBeTruthy();
  });

  it('displays transaction count for batched confirmation', () => {
    const { getByText } = renderWithProvider(<Title />, {
      state: getAppStateForConfirmation(upgradeAccountConfirmation),
    });
    expect(getByText('Includes 2 transactions')).toBeTruthy();
  });

  describe('approve transactions', () => {
    it('renders correct title and subtitle for approve ERC20', () => {
      const { getByText } = renderWithProvider(<Title />, {
        state: approveERC20TransactionStateMock,
      });
      expect(getByText('Spending cap request')).toBeTruthy();
      expect(
        getByText('This site wants permission to spend your tokens.'),
      ).toBeTruthy();
    });

    it('renders correct title and subtitle for revoke ERC20', () => {
      const { getByText } = renderWithProvider(<Title />, {
        state: revokeERC20TransactionStateMock,
      });
      expect(getByText('Remove permission')).toBeTruthy();
      expect(
        getByText(
          "You're removing someone's permission to spend tokens from your account.",
        ),
      ).toBeTruthy();
    });

    it('renders correct title and subtitle for approve NFTs', () => {
      mockUseGetTokenStandardAndDetails.mockReturnValue({
        details: {
          standard: TokenStandard.ERC721,
        },
        isPending: false,
      } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);
      const { getByText } = renderWithProvider(<Title />, {
        state: approveAllERC721TransactionStateMock,
      });
      expect(getByText('Withdrawal request')).toBeTruthy();
      expect(
        getByText('This site wants permission to withdraw your NFTs.'),
      ).toBeTruthy();
    });

    it('renders correct title and subtitle for revoke NFTs', () => {
      mockUseGetTokenStandardAndDetails.mockReturnValue({
        details: {
          standard: TokenStandard.ERC1155,
        },
        isPending: false,
      } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);
      const { getByText } = renderWithProvider(<Title />, {
        state: revokeAllERC721TransactionStateMock,
      });
      expect(getByText('Remove permission')).toBeTruthy();
      expect(
        getByText(
          'This site would like to reset the withdraw limit for your NFTs',
        ),
      ).toBeTruthy();
    });

    it('renders correct title and subtitle for decrease allowance ERC20', () => {
      const { getByText } = renderWithProvider(<Title />, {
        state: decreaseAllowanceERC20TransactionStateMock,
      });
      expect(getByText('Spending cap request')).toBeTruthy();
      expect(
        getByText('This site wants decrease the spending cap for your tokens.'),
      ).toBeTruthy();
    });
  });

  it.each([TransactionType.lendingDeposit, TransactionType.lendingWithdraw])(
    'does not render subtitle for %s',
    (transactionType) => {
      const fakeLendingDepositState = merge(generateContractInteractionState, {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [{ type: transactionType }],
            },
          },
        },
      });
      const { getByText, queryByText } = renderWithProvider(<Title />, {
        state: fakeLendingDepositState,
      });
      expect(getByText('Transaction request')).toBeTruthy();
      expect(
        queryByText('Review request details before you confirm.'),
      ).toBeNull();
    },
  );
});
