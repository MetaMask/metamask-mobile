import { ApprovalType } from '@metamask/controller-utils';
import {
  TransactionMeta,
  TransactionControllerState,
  TransactionType,
} from '@metamask/transaction-controller';

// eslint-disable-next-line import/no-namespace
import * as AddressUtils from '../../../../util/address';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useConfirmationRedesignEnabled } from './useConfirmationRedesignEnabled';

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

const ID_MOCK = '123-456-789';

function renderHook({
  approvalType,
  transactionMetadata,
  overrideRemoteFlags,
}: {
  approvalType?: ApprovalType;
  transactionMetadata?: Partial<TransactionMeta>;
  overrideRemoteFlags?: Record<string, boolean>;
}) {
  const { result } = renderHookWithProvider(useConfirmationRedesignEnabled, {
    state: {
      engine: {
        backgroundState: {
          ApprovalController: {
            pendingApprovals: {
              [ID_MOCK]: {
                id: ID_MOCK,
                type: approvalType ?? ApprovalType.Transaction,
              },
            },
          },
          TransactionController: {
            transactions: transactionMetadata ? [transactionMetadata] : [],
          } as unknown as TransactionControllerState,
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              confirmation_redesign: {
                signatures: true,
                stakingDeposit: true,
                ...overrideRemoteFlags,
              },
            },
          },
        },
      },
    },
  });

  return result.current;
}

describe('useConfirmationRedesignEnabled', () => {
  describe('signature confirmations', () => {
    it('return true for personal sign request', async () => {
      const result = renderHook({
        approvalType: ApprovalType.PersonalSign,
      });

      expect(result.isRedesignedEnabled).toBe(true);
    });

    it('return false for external accounts', async () => {
      jest.spyOn(AddressUtils, 'isHardwareAccount').mockReturnValue(true);
      const result = renderHook({
        approvalType: ApprovalType.PersonalSign,
      });

      expect(result.isRedesignedEnabled).toBe(false);
    });

    it('return false when remote flag is disabled', async () => {
      const result = renderHook({
        approvalType: ApprovalType.PersonalSign,
        overrideRemoteFlags: {
          signatures: false,
        },
      });

      expect(result.isRedesignedEnabled).toBe(false);
    });
  });

  describe('transaction redesigned confirmations', () => {
    describe('staking confirmations', () => {
      describe('staking deposit', () => {
        it('return true when enabled', async () => {
          const result = renderHook({
            approvalType: ApprovalType.Transaction,
            transactionMetadata: {
              id: ID_MOCK,
              type: TransactionType.stakingDeposit,
            },
          });

          expect(result.isRedesignedEnabled).toBe(true);
        });

        it('return false when remote flag is disabled', async () => {
          const result = renderHook({
            approvalType: ApprovalType.Transaction,
            transactionMetadata: {
              id: ID_MOCK,
              type: TransactionType.stakingDeposit,
            },
            overrideRemoteFlags: {
              stakingDeposit: false,
            },
          });

          expect(result.isRedesignedEnabled).toBe(false);
        });

        it('return false when transactionMeta is not present', async () => {
          const result = renderHook({
            approvalType: ApprovalType.Transaction,
            overrideRemoteFlags: {
              stakingDeposit: false,
            },
          });

          expect(result.isRedesignedEnabled).toBe(false);
        });

        it('return false when approval type is not transaction', async () => {
          const result = renderHook({
            approvalType: 'Not transaction' as ApprovalType,
            transactionMetadata: {
              id: ID_MOCK,
              type: TransactionType.stakingDeposit,
            },
          });

          expect(result.isRedesignedEnabled).toBe(false);
        });
      });
    });
  });
});
