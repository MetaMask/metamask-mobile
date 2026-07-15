import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  stakingDepositConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
import { useIsConfirmationFromLedgerAccount } from './useIsConfirmationFromLedgerAccount';

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
  it('returns false when from address belongs to a non-Ledger keyring', () => {
    const { result } = renderHookWithProvider(
      () => useIsConfirmationFromLedgerAccount(),
      { state: personalSignatureConfirmationState },
    );

    expect(result.current).toBe(false);
  });

  it('returns true when from address belongs to a Ledger keyring', () => {
    jest.requireMock(
      '../../../../core/Engine',
    ).context.KeyringController.state.keyrings = [
      {
        type: 'Ledger Hardware',
        accounts: ['0x935e73edb9ff52e23bac7f7e043a1ecd06d05477'],
      },
    ];

    const { result } = renderHookWithProvider(
      () => useIsConfirmationFromLedgerAccount(),
      { state: personalSignatureConfirmationState },
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
