import { ApprovalType } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';
import { merge, cloneDeep } from 'lodash';

// eslint-disable-next-line import/no-namespace
import { isHardwareAccount } from '../../../../util/address';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  stakingDepositConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
import { useConfirmationRedesignEnabled } from './useConfirmationRedesignEnabled';

jest.mock('../../../../util/address', () => ({
  ...jest.requireActual('../../../../util/address'),
  isHardwareAccount: jest.fn(),
  isExternalHardwareAccount: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  getTotalFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
      getOrAddQRKeyring: jest.fn(),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
  },
}));

describe('useConfirmationRedesignEnabled', () => {
  describe('signature confirmations', () => {
    it('returns true for personal sign request', async () => {
      const { result } = renderHookWithProvider(
        useConfirmationRedesignEnabled,
        {
          state: personalSignatureConfirmationState,
        },
      );

      expect(result.current.isRedesignedEnabled).toBe(true);
    });

    it('returns false when remote flag is disabled', async () => {
      const state = {
        engine: {
          backgroundState: {
            ...personalSignatureConfirmationState.engine.backgroundState,
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                confirmation_redesign: {
                  signatures: false,
                },
              },
            },
          },
        },
      };

      const { result } = renderHookWithProvider(
        useConfirmationRedesignEnabled,
        {
          state,
        },
      );

      expect(result.current.isRedesignedEnabled).toBe(false);
    });
  });

  describe('transaction redesigned confirmations', () => {
    describe('staking confirmations', () => {
      describe('staking deposit', () => {
        beforeEach(() => {
          jest.clearAllMocks();
          (isHardwareAccount as jest.Mock).mockReturnValue(false);
        });

        it('returns true when enabled', async () => {
          const { result } = renderHookWithProvider(
            useConfirmationRedesignEnabled,
            {
              state: stakingDepositConfirmationState,
            },
          );

          expect(result.current.isRedesignedEnabled).toBe(true);
        });

        it('returns false when remote flag is disabled', async () => {
          const withDisabledFlag = cloneDeep(stakingDepositConfirmationState);
          withDisabledFlag.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.confirmation_redesign.staking_transactions =
            false;
          const { result } = renderHookWithProvider(
            useConfirmationRedesignEnabled,
            {
              state: withDisabledFlag,
            },
          );

          expect(result.current.isRedesignedEnabled).toBe(false);
        });

        it('returns false when transactionMeta is not present', async () => {
          const withoutTransactions = cloneDeep(
            stakingDepositConfirmationState,
          );
          withoutTransactions.engine.backgroundState.TransactionController.transactions =
            [];

          const { result } = renderHookWithProvider(
            useConfirmationRedesignEnabled,
            {
              state: withoutTransactions,
            },
          );

          expect(result.current.isRedesignedEnabled).toBe(false);
        });

        it('returns false when approval type is not transaction', async () => {
          const approvalId =
            stakingDepositConfirmationState.engine.backgroundState
              .TransactionController.transactions[0].id;

          const state = merge(stakingDepositConfirmationState, {
            engine: {
              backgroundState: {
                ApprovalController: {
                  pendingApprovals: {
                    [approvalId]: {
                      type: 'not_transaction' as ApprovalType,
                    },
                  },
                },
              },
            },
          });

          const { result } = renderHookWithProvider(
            useConfirmationRedesignEnabled,
            {
              state,
            },
          );

          expect(result.current.isRedesignedEnabled).toBe(false);
        });

        it('returns false when from address is external hardware account', async () => {
          (isHardwareAccount as jest.Mock).mockReturnValue(true);
          const { result } = renderHookWithProvider(
            useConfirmationRedesignEnabled,
            {
              state: stakingDepositConfirmationState,
            },
          );

          expect(result.current.isRedesignedEnabled).toBe(false);
        });

        it('only redesign if transactions is staking deposit', async () => {
          const withBridgeTransaction = cloneDeep(
            stakingDepositConfirmationState,
          );
          withBridgeTransaction.engine.backgroundState.TransactionController.transactions[0].type =
            TransactionType.bridge;

          const { result } = renderHookWithProvider(
            useConfirmationRedesignEnabled,
            {
              state: withBridgeTransaction,
            },
          );

          expect(result.current.isRedesignedEnabled).toBe(false);
        });
      });
    });
  });
});
