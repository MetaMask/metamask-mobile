import { ApprovalType } from '@metamask/controller-utils';
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
    beforeEach(() => {
      jest.clearAllMocks();
      (isHardwareAccount as jest.Mock).mockReturnValue(true);
    });

    it('return true for personal sign request', async () => {
      (isHardwareAccount as jest.Mock).mockReturnValue(false);
      const { result } = renderHookWithProvider(
        useConfirmationRedesignEnabled,
        {
          state: personalSignatureConfirmationState,
        },
      );

      expect(result.current.isRedesignedEnabled).toBe(true);
    });

    it('return false for external accounts', async () => {
      const { result } = renderHookWithProvider(
        useConfirmationRedesignEnabled,
        {
          state: personalSignatureConfirmationState,
        },
      );

      expect(result.current.isRedesignedEnabled).toBe(false);
    });

    it('return false when remote flag is disabled', async () => {
      const state = merge(personalSignatureConfirmationState, {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                confirmation_redesign: {
                  signatures: false,
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
  });

  describe('transaction redesigned confirmations', () => {
    describe('staking confirmations', () => {
      describe('staking deposit', () => {
        it('return true when enabled', async () => {
          const { result } = renderHookWithProvider(
            useConfirmationRedesignEnabled,
            {
              state: stakingDepositConfirmationState,
            },
          );

          expect(result.current.isRedesignedEnabled).toBe(true);
        });

        it('return false when remote flag is disabled', async () => {
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

        it('return false when transactionMeta is not present', async () => {
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

        it('return false when approval type is not transaction', async () => {
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
      });
    });
  });
});
