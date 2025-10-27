import {
  selectPredictControllerState,
  selectPredictDepositTransaction,
  selectPredictClaimTransaction,
} from './index';
import { PredictDepositStatus, PredictClaimStatus } from '../../types';

describe('Predict Controller Selectors', () => {
  describe('selectPredictControllerState', () => {
    it('selects the PredictController state', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              eligibility: {},
              lastError: null,
              lastUpdateTimestamp: 0,
              claimTransaction: null,
              depositTransaction: null,
              isOnboarded: {},
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictControllerState(mockState as any);

      expect(result).toEqual(
        mockState.engine.backgroundState.PredictController,
      );
    });
  });

  describe('selectPredictDepositTransaction', () => {
    it('returns deposit transaction when it exists', () => {
      const depositTransaction = {
        batchId: 'batch-123',
        chainId: 137,
        status: PredictDepositStatus.PENDING,
        providerId: 'polymarket',
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction,
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictDepositTransaction(mockState as any);

      expect(result).toEqual(depositTransaction);
    });

    it('returns null when deposit transaction does not exist', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: null,
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictDepositTransaction(mockState as any);

      expect(result).toBeNull();
    });

    it('returns null when PredictController state is undefined', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: undefined,
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictDepositTransaction(mockState as any);

      expect(result).toBeNull();
    });
  });

  describe('selectPredictClaimTransaction', () => {
    it('returns claim transaction when it exists', () => {
      const claimTransaction = {
        transactionId: 'tx-123',
        chainId: 137,
        status: PredictClaimStatus.PENDING,
        txParams: {
          to: '0x123' as `0x${string}`,
          data: '0xabc' as `0x${string}`,
          value: '0x0' as `0x${string}`,
        },
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimTransaction,
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictClaimTransaction(mockState as any);

      expect(result).toEqual(claimTransaction);
    });

    it('returns null when claim transaction does not exist', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimTransaction: null,
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictClaimTransaction(mockState as any);

      expect(result).toBeNull();
    });

    it('returns null when PredictController state is undefined', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: undefined,
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictClaimTransaction(mockState as any);

      expect(result).toBeNull();
    });
  });
});
