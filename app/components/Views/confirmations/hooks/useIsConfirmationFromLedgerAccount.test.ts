import { EthAccountType } from '@metamask/keyring-api';
import { TransactionType } from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  stakingDepositConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
import ExtendedKeyringTypes from '../../../../constants/keyringTypes';
import Engine from '../../../../core/Engine';
import { useIsConfirmationFromLedgerAccount } from './useIsConfirmationFromLedgerAccount';

const MONEY_ACCOUNT_ADDRESS = '0x1111111111111111111111111111111111111111';
const SOFTWARE_RECIPIENT_ADDRESS = '0x2222222222222222222222222222222222222222';
const LEDGER_RECIPIENT_ADDRESS = '0x3333333333333333333333333333333333333333';
const QR_RECIPIENT_ADDRESS = '0x4444444444444444444444444444444444444444';
const ONEKEY_RECIPIENT_ADDRESS = '0x5555555555555555555555555555555555555555';
const MONEY_TX_ID = 'money-tx-id';

function buildMoneyAccountState(
  overrideAccountId: string,
  overrideAddress: string,
  overrideKeyringType: ExtendedKeyringTypes,
  type: TransactionType,
) {
  return {
    ...stakingDepositConfirmationState,
    engine: {
      backgroundState: {
        ...stakingDepositConfirmationState.engine.backgroundState,
        AccountsController: {
          internalAccounts: {
            accounts: {
              [overrideAccountId]: {
                address: overrideAddress,
                id: overrideAccountId,
                metadata: {
                  keyring: { type: overrideKeyringType },
                  name: 'Recipient',
                },
                type: EthAccountType.Eoa,
              },
            },
            selectedAccount: overrideAccountId,
          },
        },
        ApprovalController: {
          approvalFlows: [],
          pendingApprovalCount: 1,
          pendingApprovals: {
            [MONEY_TX_ID]: {
              expectsResult: false,
              id: MONEY_TX_ID,
              origin: 'metamask',
              requestData: { txId: MONEY_TX_ID },
              requestState: null,
              time: 1,
              type: 'transaction',
            },
          },
        },
        TransactionController: {
          transactions: [
            {
              chainId: '0x8f' as const,
              id: MONEY_TX_ID,
              txParams: { from: MONEY_ACCOUNT_ADDRESS },
              type,
            },
          ],
        },
        TransactionPayController: {
          transactionData: {
            [MONEY_TX_ID]: { accountOverride: overrideAccountId },
          },
        },
      },
    },
  };
}

jest.mock('../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [
          {
            type: 'HD Key Tree',
            accounts: ['0x935e73edb9ff52e23bac7f7e043a1ecd06d05477'],
          },
        ],
      },
    },
  },
}));

describe('useIsConfirmationFromLedgerAccount', () => {
  beforeEach(() => {
    Engine.context.KeyringController.state.keyrings = [
      {
        type: ExtendedKeyringTypes.hd,
        accounts: [
          '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
          SOFTWARE_RECIPIENT_ADDRESS,
        ],
      },
      {
        type: ExtendedKeyringTypes.money,
        accounts: [MONEY_ACCOUNT_ADDRESS],
      },
      {
        type: ExtendedKeyringTypes.ledger,
        accounts: [LEDGER_RECIPIENT_ADDRESS],
      },
      {
        type: ExtendedKeyringTypes.qr,
        accounts: [QR_RECIPIENT_ADDRESS],
      },
      {
        type: ExtendedKeyringTypes.oneKey,
        accounts: [ONEKEY_RECIPIENT_ADDRESS],
      },
    ] as never;
  });

  it('returns false when from address belongs to a non-Ledger keyring', () => {
    const { result } = renderHookWithProvider(
      () => useIsConfirmationFromLedgerAccount(),
      { state: personalSignatureConfirmationState },
    );

    expect(result.current).toBe(false);
  });

  it('returns true when from address belongs to a Ledger keyring', () => {
    Engine.context.KeyringController.state.keyrings = [
      {
        type: ExtendedKeyringTypes.ledger,
        accounts: ['0x935e73edb9ff52e23bac7f7e043a1ecd06d05477'],
      },
    ] as never;

    const { result } = renderHookWithProvider(
      () => useIsConfirmationFromLedgerAccount(),
      { state: personalSignatureConfirmationState },
    );

    expect(result.current).toBe(true);
  });

  it.each([
    [
      'Ledger',
      'ledger-account-id',
      LEDGER_RECIPIENT_ADDRESS,
      ExtendedKeyringTypes.ledger,
    ],
    ['QR', 'qr-account-id', QR_RECIPIENT_ADDRESS, ExtendedKeyringTypes.qr],
    [
      'OneKey',
      'onekey-account-id',
      ONEKEY_RECIPIENT_ADDRESS,
      ExtendedKeyringTypes.oneKey,
    ],
    [
      'non-hardware',
      'software-account-id',
      SOFTWARE_RECIPIENT_ADDRESS,
      ExtendedKeyringTypes.hd,
    ],
  ])(
    'returns false for money account withdraw with a %s recipient override',
    (_label, overrideAccountId, overrideAddress, overrideKeyringType) => {
      const state = buildMoneyAccountState(
        overrideAccountId,
        overrideAddress,
        overrideKeyringType,
        TransactionType.moneyAccountWithdraw,
      );

      const { result } = renderHookWithProvider(
        () => useIsConfirmationFromLedgerAccount(),
        { state },
      );

      expect(result.current).toBe(false);
    },
  );

  it('returns true for money account deposit when account override is a Ledger payer', () => {
    const state = buildMoneyAccountState(
      'ledger-account-id',
      LEDGER_RECIPIENT_ADDRESS,
      ExtendedKeyringTypes.ledger,
      TransactionType.moneyAccountDeposit,
    );

    const { result } = renderHookWithProvider(
      () => useIsConfirmationFromLedgerAccount(),
      { state },
    );

    expect(result.current).toBe(true);
  });

  it('returns false when there is no from address', () => {
    const stateWithNoFrom = {
      ...stakingDepositConfirmationState,
      engine: {
        backgroundState: {
          ...stakingDepositConfirmationState.engine.backgroundState,
          ApprovalController: {
            pendingApprovals: {
              'test-id': {
                id: 'test-id',
                origin: 'metamask',
                type: 'transaction',
                time: 1,
                requestData: {},
                requestState: null,
                expectsResult: false,
              },
            },
            pendingApprovalCount: 1,
            approvalFlows: [],
          },
          TransactionController: {
            transactions: [],
          },
        },
      },
    };

    const { result } = renderHookWithProvider(
      () => useIsConfirmationFromLedgerAccount(),
      { state: stateWithNoFrom },
    );

    expect(result.current).toBe(false);
  });
});
