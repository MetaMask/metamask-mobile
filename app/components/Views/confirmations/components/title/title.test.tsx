import React from 'react';
import { merge } from 'lodash';
import { TransactionType } from '@metamask/transaction-controller';

import {
  mockTxId,
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
import { useParams } from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';
import { ApprovalType } from '@metamask/controller-utils';

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(() => ({})),
}));

jest.mock('../../hooks/useGetTokenStandardAndDetails');

jest.mock('../../hooks/ui/useFullScreenConfirmation', () => ({
  useFullScreenConfirmation: jest.fn(() => ({
    isFullScreenConfirmation: false,
  })),
}));

describe('Confirm Title', () => {
  const typedSignRequestId = 'fb2029e1-b0ab-11ef-9227-05a11087c334';
  const daiPermitAllowedStringFalseData = JSON.stringify({
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Permit: [
        { name: 'holder', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'expiry', type: 'uint256' },
        { name: 'allowed', type: 'bool' },
      ],
    },
    primaryType: 'Permit',
    domain: {
      name: 'Dai Stablecoin',
      version: '1',
      chainId: 1,
      verifyingContract: '0x6b175474e89094c44da98b954eedeac495271d0f',
    },
    message: {
      holder: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
      spender: '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4',
      nonce: '0',
      expiry:
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      allowed: 'false',
    },
  });

  const mockUseGetTokenStandardAndDetails = jest.mocked(
    useGetTokenStandardAndDetails,
  );
  const mockUseParams = jest.mocked(useParams);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({});
    mockUseGetTokenStandardAndDetails.mockReturnValue({
      details: {
        standard: TokenStandard.ERC20,
        decimalsNumber: 0,
      },
      isPending: false,
    } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);
  });

  describe('Money Account Deposit', () => {
    it('renders the deposit title and hides the two-transaction badge', () => {
      const moneyAccountState = merge({}, generateContractInteractionState, {
        engine: {
          backgroundState: {
            ApprovalController: {
              pendingApprovals: {
                [mockTxId]: {
                  id: mockTxId,
                  type: ApprovalType.TransactionBatch,
                  requestData: { txId: mockTxId },
                },
              },
            },
            TransactionController: {
              transactions: [
                {
                  id: mockTxId,
                  type: TransactionType.batch,
                  chainId: '0x1',
                  nestedTransactions: [
                    { type: TransactionType.tokenMethodApprove },
                    { type: TransactionType.moneyAccountDeposit },
                  ],
                },
              ],
            },
          },
        },
      });

      const { getByText, queryByText } = renderWithProvider(<Title />, {
        state: moneyAccountState,
      });

      expect(
        getByText(strings('confirm.title.money_account_add_money')),
      ).toBeOnTheScreen();
      expect(
        queryByText(
          strings('confirm.7702_functionality.includes_transaction', {
            transactionCount: 2,
          }),
        ),
      ).toBeNull();
    });
  });

  describe('Perps', () => {
    it('renders Perps Deposit title', () => {
      const perpsDepositState = merge({}, generateContractInteractionState, {
        engine: {
          backgroundState: {
            ApprovalController: {
              pendingApprovals: {
                [mockTxId]: {
                  id: mockTxId,
                  type: ApprovalType.Transaction,
                  requestData: { txId: mockTxId },
                },
              },
            },
            TransactionController: {
              transactions: [
                {
                  id: mockTxId,
                  type: TransactionType.perpsDeposit,
                  chainId: '0x1',
                },
              ],
            },
          },
        },
      });

      const { getByText } = renderWithProvider(<Title />, {
        state: perpsDepositState,
      });

      expect(
        getByText(strings('confirm.title.perps_deposit')),
      ).toBeOnTheScreen();
    });
  });

  describe('forceBottomSheet', () => {
    it('uses smaller font when forceBottomSheet is true', () => {
      mockUseParams.mockReturnValue({ forceBottomSheet: true });
      const { getByText } = renderWithProvider(<Title />, {
        state: personalSignatureConfirmationState,
      });

      const titleEl = getByText('Signature request');
      expect(titleEl).toHaveStyle({ fontSize: 16 });
    });

    it('uses default font when forceBottomSheet is false', () => {
      mockUseParams.mockReturnValue({ forceBottomSheet: false });
      const { getByText } = renderWithProvider(<Title />, {
        state: personalSignatureConfirmationState,
      });

      const titleEl = getByText('Signature request');
      expect(titleEl).toHaveStyle({ fontSize: 20 });
    });
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

  it('renders permit title for DAI permit when allowed is string "false"', () => {
    const state = merge({}, typedSignV4ConfirmationState, {
      engine: {
        backgroundState: {
          ApprovalController: {
            pendingApprovals: {
              [typedSignRequestId]: {
                requestData: {
                  data: daiPermitAllowedStringFalseData,
                },
              },
            },
          },
          SignatureController: {
            signatureRequests: {
              [typedSignRequestId]: {
                messageParams: {
                  data: daiPermitAllowedStringFalseData,
                },
              },
            },
          },
        },
      },
    });

    const { getByText, queryByText } = renderWithProvider(<Title />, {
      state,
    });

    expect(getByText('Spending cap request')).toBeTruthy();
    expect(
      getByText('This site wants permission to spend your tokens.'),
    ).toBeTruthy();
    expect(queryByText('Remove permission')).toBeNull();
  });

  it('renders spending cap title for a Permit2 PermitBatch with an injected "value": "0" sibling', () => {
    const permitBatchInjectedValueData = JSON.stringify({
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        PermitBatch: [
          { name: 'details', type: 'PermitDetails[]' },
          { name: 'spender', type: 'address' },
          { name: 'sigDeadline', type: 'uint256' },
        ],
        PermitDetails: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint160' },
          { name: 'expiration', type: 'uint48' },
          { name: 'nonce', type: 'uint48' },
        ],
      },
      primaryType: 'PermitBatch',
      domain: {
        name: 'Permit2',
        chainId: 1,
        verifyingContract: '0x000000000022d473030f116ddee9f6b43ac78ba3',
      },
      message: {
        details: [
          {
            token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            amount: '1461501637330902918203684832716283019655932542975',
            expiration: '281474976710655',
            nonce: 0,
          },
        ],
        spender: '0x4444444444444444444444444444444444444444',
        sigDeadline: '281474976710655',
        // Malicious undeclared sibling — stripped from the signed digest.
        value: '0',
      },
    });

    const state = merge({}, typedSignV4ConfirmationState, {
      engine: {
        backgroundState: {
          ApprovalController: {
            pendingApprovals: {
              [typedSignRequestId]: {
                requestData: {
                  data: permitBatchInjectedValueData,
                },
              },
            },
          },
          SignatureController: {
            signatureRequests: {
              [typedSignRequestId]: {
                messageParams: {
                  data: permitBatchInjectedValueData,
                },
              },
            },
          },
        },
      },
    });

    const { getByText, queryByText } = renderWithProvider(<Title />, {
      state,
    });

    expect(getByText('Spending cap request')).toBeTruthy();
    expect(queryByText('Remove permission')).toBeNull();
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

  it('renders no title for transfer', () => {
    const { queryByText } = renderWithProvider(<Title />, {
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
    expect(queryByText('Transfer request')).toBeNull();
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

  it('renders correct title and subtitle for musdClaim', () => {
    const musdClaimState = merge({}, generateContractInteractionState, {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              {
                type: TransactionType.musdClaim,
                chainId: '0xe708',
              },
            ],
          },
          NetworkController: {
            networkConfigurationsByChainId: {
              '0xe708': {
                name: 'Linea Mainnet',
                nativeCurrency: 'ETH',
                rpcEndpoints: [
                  {
                    networkClientId: 'linea-mainnet',
                    url: 'https://linea-mainnet.infura.io/v3/test',
                    name: 'Linea Mainnet',
                  },
                ],
                defaultRpcEndpointIndex: 0,
              },
            },
          },
        },
      },
    });
    const { getByText } = renderWithProvider(<Title />, {
      state: musdClaimState,
    });
    expect(getByText('Claim bonus')).toBeTruthy();
    expect(getByText('Bonus will be paid out on Linea Mainnet.')).toBeTruthy();
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
