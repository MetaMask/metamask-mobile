import { ApprovalType } from '@metamask/controller-utils';
import { merge } from 'lodash';

// eslint-disable-next-line import/no-namespace
import * as AddressUtils from '../../../../util/address';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useConfirmationRedesignEnabled } from './useConfirmationRedesignEnabled';
import {
  personalSignatureConfirmationState,
  stakingDepositConfirmationState,
} from '../../../../util/test/confirm-data-helpers';

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
    it('return true for personal sign request', async () => {
      const { result } = renderHookWithProvider(
        useConfirmationRedesignEnabled,
        {
          state: personalSignatureConfirmationState,
        },
      );

      expect(result.current.isRedesignedEnabled).toBe(true);
    });

    it('return false for external accounts', async () => {
      jest.spyOn(AddressUtils, 'isHardwareAccount').mockReturnValue(true);
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
          const state = merge(stakingDepositConfirmationState, {
            engine: {
              backgroundState: {
                RemoteFeatureFlagController: {
                  remoteFeatureFlags: {
                    confirmation_redesign: {
                      stakingDeposit: false,
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

        it('return false when transactionMeta is not present', async () => {
          const state = merge(stakingDepositConfirmationState, {
            engine: {
              backgroundState: {
                TransactionController: {
                  transactions: [],
                },
                RemoteFeatureFlagController: {
                  remoteFeatureFlags: {
                    confirmation_redesign: {
                      stakingDeposit: false,
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
