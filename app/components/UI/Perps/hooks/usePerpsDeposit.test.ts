import type { RootState } from '../../../../reducers';
import {
  renderHookWithProvider,
  type DeepPartial,
} from '../../../../util/test/renderWithProvider';
import type { DepositFlowType, DepositStatus } from '../controllers/types';
import { usePerpsDeposit } from './usePerpsDeposit';

describe('usePerpsDeposit', () => {
  describe('default state', () => {
    it('should return default state when PerpsController is undefined', () => {
      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: undefined,
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsDeposit(), {
        state,
      });

      expect(result.current).toEqual({
        status: 'idle',
        flowType: null,
        currentTxHash: null,
        error: null,
        requiresModalDismissal: false,
        steps: {
          totalSteps: 0,
          currentStep: 0,
          stepNames: [],
          stepTxHashes: [],
        },
      });
    });
  });

  describe('state from PerpsController', () => {
    it('should return deposit state from PerpsController', () => {
      const mockDepositState = {
        depositStatus: 'processing' as DepositStatus,
        depositFlowType: 'direct' as DepositFlowType,
        currentDepositTxHash: '0x123',
        depositError: null,
        requiresModalDismissal: false,
        depositSteps: {
          totalSteps: 1,
          currentStep: 1,
          stepNames: ['Depositing to HyperLiquid'],
          stepTxHashes: ['0x123'],
          currentStepName: 'Depositing to HyperLiquid',
        },
      };

      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: mockDepositState,
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsDeposit(), {
        state,
      });

      expect(result.current).toEqual({
        status: 'processing',
        flowType: 'direct',
        currentTxHash: '0x123',
        error: null,
        requiresModalDismissal: false,
        steps: {
          totalSteps: 1,
          currentStep: 1,
          stepNames: ['Depositing to HyperLiquid'],
          stepTxHashes: ['0x123'],
          currentStepName: 'Depositing to HyperLiquid',
        },
      });
    });

    it('should handle error state', () => {
      const mockErrorState = {
        depositStatus: 'error' as DepositStatus,
        depositFlowType: 'direct' as DepositFlowType,
        currentDepositTxHash: null,
        depositError: 'Transaction failed',
        requiresModalDismissal: true,
        depositSteps: {
          totalSteps: 1,
          currentStep: 1,
          stepNames: ['Depositing to HyperLiquid'],
          stepTxHashes: [],
          currentStepName: 'Depositing to HyperLiquid',
        },
      };

      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: mockErrorState,
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsDeposit(), {
        state,
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('Transaction failed');
      expect(result.current.requiresModalDismissal).toBe(true);
    });

    it('should handle success state', () => {
      const mockSuccessState = {
        depositStatus: 'success' as DepositStatus,
        depositFlowType: 'direct' as DepositFlowType,
        currentDepositTxHash: '0x456',
        depositError: null,
        requiresModalDismissal: false,
        depositSteps: {
          totalSteps: 1,
          currentStep: 1,
          stepNames: ['Depositing to HyperLiquid'],
          stepTxHashes: ['0x456'],
          currentStepName: 'Depositing to HyperLiquid',
        },
      };

      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: mockSuccessState,
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsDeposit(), {
        state,
      });

      expect(result.current.status).toBe('success');
      expect(result.current.currentTxHash).toBe('0x456');
      expect(result.current.error).toBeNull();
    });
  });

  describe('partial state handling', () => {
    it('should handle missing optional fields with defaults', () => {
      const partialState = {
        depositStatus: 'processing' as DepositStatus,
        // Missing other fields
      };

      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: partialState,
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsDeposit(), {
        state,
      });

      expect(result.current).toEqual({
        status: 'processing',
        flowType: null,
        currentTxHash: null,
        error: null,
        requiresModalDismissal: false,
        steps: {
          totalSteps: 0,
          currentStep: 0,
          stepNames: [],
          stepTxHashes: [],
        },
      });
    });

    it('should handle empty PerpsController state', () => {
      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: {},
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsDeposit(), {
        state,
      });

      expect(result.current).toEqual({
        status: 'idle',
        flowType: null,
        currentTxHash: null,
        error: null,
        requiresModalDismissal: false,
        steps: {
          totalSteps: 0,
          currentStep: 0,
          stepNames: [],
          stepTxHashes: [],
        },
      });
    });
  });
});
