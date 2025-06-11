import { ApprovalType } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';
import { merge, cloneDeep } from 'lodash';

// eslint-disable-next-line import/no-namespace
import { isHardwareAccount } from '../../../../util/address';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  downgradeAccountConfirmation,
  getAppStateForConfirmation,
  personalSignatureConfirmationState,
  stakingDepositConfirmationState,
  transferConfirmationState,
  upgradeAccountConfirmation,
} from '../../../../util/test/confirm-data-helpers';
import { useConfirmationRedesignEnabled } from './useConfirmationRedesignEnabled';
import { selectConfirmationRedesignFlags } from '../../../../selectors/featureFlagController/confirmations';

const disabledFeatureFlags = {
  signatures: false,
  staking_confirmations: false,
  contract_interaction: false,
  transfer: false,
};

jest.mock('../../../../util/address', () => ({
  ...jest.requireActual('../../../../util/address'),
  isHardwareAccount: jest.fn(),
  isExternalHardwareAccount: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
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

jest.mock('../../../../selectors/featureFlagController/confirmations');

describe('useConfirmationRedesignEnabled', () => {
  const confirmationRedesignFlagsMock = jest.mocked(
    selectConfirmationRedesignFlags,
  );
  const isHardwareAccountMock = jest.mocked(isHardwareAccount);

  beforeEach(() => {
    jest.clearAllMocks();
    isHardwareAccountMock.mockReturnValue(false);
    confirmationRedesignFlagsMock.mockReturnValue(disabledFeatureFlags);
  });

  describe('signature confirmations', () => {
    it('returns true for personal sign request', async () => {
      confirmationRedesignFlagsMock.mockReturnValue({
        ...disabledFeatureFlags,
        signatures: true,
      });

      const { result } = renderHookWithProvider(
        useConfirmationRedesignEnabled,
        {
          state: personalSignatureConfirmationState,
        },
      );

      expect(result.current.isRedesignedEnabled).toBe(true);
    });

    it('returns false when remote flag is disabled', async () => {
      const { result } = renderHookWithProvider(
        useConfirmationRedesignEnabled,
        {
          state: personalSignatureConfirmationState,
        },
      );

      expect(result.current.isRedesignedEnabled).toBe(false);
    });
  });

  describe('transaction redesigned confirmations', () => {
    describe('staking confirmations', () => {
      describe('staking deposit', () => {
        it('returns true when enabled', async () => {
          confirmationRedesignFlagsMock.mockReturnValue({
            ...disabledFeatureFlags,
            staking_confirmations: true,
          });

          const { result } = renderHookWithProvider(
            useConfirmationRedesignEnabled,
            {
              state: stakingDepositConfirmationState,
            },
          );

          expect(result.current.isRedesignedEnabled).toBe(true);
        });

        it('returns false when remote flag is disabled', async () => {
          confirmationRedesignFlagsMock.mockReturnValue({
            ...disabledFeatureFlags,
            signatures: true,
          });

          const { result } = renderHookWithProvider(
            useConfirmationRedesignEnabled,
            {
              state: stakingDepositConfirmationState,
            },
          );

          expect(result.current.isRedesignedEnabled).toBe(false);
        });

        it('returns false when transactionMeta is not present', async () => {
          confirmationRedesignFlagsMock.mockReturnValue({
            ...disabledFeatureFlags,
            signatures: true,
            staking_confirmations: true,
          });

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
          confirmationRedesignFlagsMock.mockReturnValue({
            ...disabledFeatureFlags,
            signatures: true,
            staking_confirmations: true,
          });

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
          confirmationRedesignFlagsMock.mockReturnValue({
            ...disabledFeatureFlags,
            signatures: true,
            staking_confirmations: true,
          });

          isHardwareAccountMock.mockReturnValue(true);
          const { result } = renderHookWithProvider(
            useConfirmationRedesignEnabled,
            {
              state: stakingDepositConfirmationState,
            },
          );

          expect(result.current.isRedesignedEnabled).toBe(false);
        });

        it('only redesign if transactions is staking deposit', async () => {
          confirmationRedesignFlagsMock.mockReturnValue({
            ...disabledFeatureFlags,
            signatures: true,
            staking_confirmations: true,
          });

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

    describe('transfer confirmations', () => {
      it('returns true when flag is enabled', async () => {
        confirmationRedesignFlagsMock.mockReturnValue({
          ...disabledFeatureFlags,
          transfer: true,
        });

        const { result } = renderHookWithProvider(
          useConfirmationRedesignEnabled,
          {
            state: transferConfirmationState,
          },
        );

        expect(result.current.isRedesignedEnabled).toBe(true);
      });

      it('returns false when approval type is not transaction', async () => {
        confirmationRedesignFlagsMock.mockReturnValue(disabledFeatureFlags);

        const { result } = renderHookWithProvider(
          useConfirmationRedesignEnabled,
          {
            state: personalSignatureConfirmationState,
          },
        );

        expect(result.current.isRedesignedEnabled).toBe(false);
      });
    });

    describe('7702 - upgrade / downgrade confirmations', () => {
      it('returns true for smart account upgrade confirmation', async () => {
        const { result } = renderHookWithProvider(
          useConfirmationRedesignEnabled,
          {
            state: getAppStateForConfirmation(upgradeAccountConfirmation),
          },
        );

        expect(result.current.isRedesignedEnabled).toBe(true);
      });

      it('returns true for smart account downgrade confirmation', async () => {
        const { result } = renderHookWithProvider(
          useConfirmationRedesignEnabled,
          {
            state: getAppStateForConfirmation(downgradeAccountConfirmation),
          },
        );

        expect(result.current.isRedesignedEnabled).toBe(true);
      });
    });
  });

  it('if confirmation is a transaction, validates `txParams.from` is hardware account', () => {
    isHardwareAccountMock.mockReturnValue(true);
    confirmationRedesignFlagsMock.mockReturnValue({
      ...disabledFeatureFlags,
      transfer: true,
    });

    const { result } = renderHookWithProvider(useConfirmationRedesignEnabled, {
      state: transferConfirmationState,
    });

    const expectedFromAddress =
      transferConfirmationState.engine.backgroundState.TransactionController
        .transactions[0].txParams.from;

    expect(isHardwareAccountMock).toHaveBeenCalledTimes(1);
    expect(isHardwareAccountMock).toHaveBeenCalledWith(expectedFromAddress);

    expect(result.current.isRedesignedEnabled).toBe(false);
  });
});
