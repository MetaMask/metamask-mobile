import type { RootState } from '../../../../reducers';
import {
  renderHookWithProvider,
  type DeepPartial,
} from '../../../../util/test/renderWithProvider';
import type { DepositFlowType, DepositStatus } from '../controllers/types';
import { usePerpsDeposit } from './usePerpsDeposit';

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

describe('usePerpsDeposit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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


  describe('deposit flow states', () => {
    it('should transition through direct deposit flow states', () => {
      const states = [
        {
          depositStatus: 'preparing' as DepositStatus,
          depositFlowType: 'direct' as DepositFlowType,
          depositSteps: {
            totalSteps: 1,
            currentStep: 0,
            stepNames: ['Preparing deposit'],
            stepTxHashes: [],
          },
        },
        {
          depositStatus: 'processing' as DepositStatus,
          depositFlowType: 'direct' as DepositFlowType,
          currentDepositTxHash: '0x123',
          depositSteps: {
            totalSteps: 1,
            currentStep: 1,
            stepNames: ['Depositing to HyperLiquid'],
            stepTxHashes: ['0x123'],
          },
        },
        {
          depositStatus: 'success' as DepositStatus,
          depositFlowType: 'direct' as DepositFlowType,
          currentDepositTxHash: '0x123',
          depositSteps: {
            totalSteps: 1,
            currentStep: 1,
            stepNames: ['Depositing to HyperLiquid'],
            stepTxHashes: ['0x123'],
          },
        },
      ];

      states.forEach((mockState) => {
        const state: DeepPartial<RootState> = {
          engine: {
            backgroundState: {
              PerpsController: mockState,
            },
          },
        };

        const { result } = renderHookWithProvider(() => usePerpsDeposit(), {
          state,
        });

        expect(result.current.status).toBe(mockState.depositStatus);
        expect(result.current.flowType).toBe(mockState.depositFlowType);
        if (mockState.currentDepositTxHash) {
          expect(result.current.currentTxHash).toBe(mockState.currentDepositTxHash);
        }
      });
    });

    it('should handle swap flow with multiple steps', () => {
      const swapFlowState = {
        depositStatus: 'processing' as DepositStatus,
        depositFlowType: 'swap' as DepositFlowType,
        currentDepositTxHash: '0x456',
        depositSteps: {
          totalSteps: 2,
          currentStep: 1,
          stepNames: ['Swapping tokens', 'Depositing to HyperLiquid'],
          stepTxHashes: ['0x456'],
          currentStepName: 'Swapping tokens',
        },
      };

      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: swapFlowState,
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsDeposit(), {
        state,
      });

      expect(result.current.status).toBe('processing');
      expect(result.current.flowType).toBe('swap');
      expect(result.current.steps.totalSteps).toBe(2);
      expect(result.current.steps.currentStep).toBe(1);
      expect(result.current.steps.stepNames).toEqual([
        'Swapping tokens',
        'Depositing to HyperLiquid',
      ]);
    });

    it('should handle bridge flow with multiple steps', () => {
      const bridgeFlowState = {
        depositStatus: 'processing' as DepositStatus,
        depositFlowType: 'bridge' as DepositFlowType,
        currentDepositTxHash: '0x789',
        depositSteps: {
          totalSteps: 3,
          currentStep: 2,
          stepNames: ['Bridging to Arbitrum', 'Swapping tokens', 'Depositing to HyperLiquid'],
          stepTxHashes: ['0x789', '0xabc'],
          currentStepName: 'Swapping tokens',
        },
      };

      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: bridgeFlowState,
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsDeposit(), {
        state,
      });

      expect(result.current.status).toBe('processing');
      expect(result.current.flowType).toBe('bridge');
      expect(result.current.steps.totalSteps).toBe(3);
      expect(result.current.steps.currentStep).toBe(2);
      expect(result.current.steps.stepTxHashes).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should handle deposit errors with modal dismissal requirement', () => {
      const errorState = {
        depositStatus: 'error' as DepositStatus,
        depositFlowType: 'direct' as DepositFlowType,
        depositError: 'Insufficient balance',
        requiresModalDismissal: true,
        depositSteps: {
          totalSteps: 1,
          currentStep: 0,
          stepNames: ['Depositing to HyperLiquid'],
          stepTxHashes: [],
        },
      };

      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: errorState,
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsDeposit(), {
        state,
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('Insufficient balance');
      expect(result.current.requiresModalDismissal).toBe(true);
    });

    it('should handle network errors', () => {
      const networkErrorState = {
        depositStatus: 'error' as DepositStatus,
        depositFlowType: 'bridge' as DepositFlowType,
        depositError: 'Network connection failed',
        requiresModalDismissal: false,
        depositSteps: {
          totalSteps: 3,
          currentStep: 1,
          stepNames: ['Bridging to Arbitrum', 'Swapping tokens', 'Depositing to HyperLiquid'],
          stepTxHashes: ['0x123'],
        },
      };

      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: networkErrorState,
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsDeposit(), {
        state,
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('Network connection failed');
      expect(result.current.steps.currentStep).toBe(1);
      expect(result.current.steps.stepTxHashes).toHaveLength(1);
    });
  });
});
