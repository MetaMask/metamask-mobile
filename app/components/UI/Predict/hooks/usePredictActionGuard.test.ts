import { renderHook, act } from '@testing-library/react-hooks';
import Routes from '../../../../constants/navigation/Routes';
import { usePredictActionGuard } from './usePredictActionGuard';
import { PredictEventValues } from '../constants/eventNames';

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const mockUsePredictEligibility = jest.fn();
jest.mock('./usePredictEligibility', () => ({
  usePredictEligibility: () => mockUsePredictEligibility(),
}));

const mockUsePredictBalance = jest.fn();
jest.mock('./usePredictBalance', () => ({
  usePredictBalance: () => mockUsePredictBalance(),
}));

const mockDeposit = jest.fn();
const mockUsePredictDeposit = jest.fn();
jest.mock('./usePredictDeposit', () => ({
  usePredictDeposit: (params: unknown) => mockUsePredictDeposit(params),
}));

describe('usePredictActionGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictEligibility.mockReturnValue({
      isEligible: true,
      refreshEligibility: jest.fn(),
    });
    mockUsePredictBalance.mockReturnValue({
      hasNoBalance: false,
    });
    mockUsePredictDeposit.mockReturnValue({
      deposit: mockDeposit,
      isDepositPending: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when user is eligible and has balance', () => {
    it('executes action without navigation when checkBalance is false', async () => {
      const { result } = renderHook(() =>
        usePredictActionGuard({
          providerId: 'polymarket',
          navigation: mockNavigation,
        }),
      );

      const mockAction = jest.fn();

      await act(async () => {
        await result.current.executeGuardedAction(mockAction);
      });

      expect(mockAction).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('executes action without navigation when checkBalance is true', async () => {
      const { result } = renderHook(() =>
        usePredictActionGuard({
          providerId: 'polymarket',
          navigation: mockNavigation,
        }),
      );

      const mockAction = jest.fn();

      await act(async () => {
        await result.current.executeGuardedAction(mockAction, {
          checkBalance: true,
        });
      });

      expect(mockAction).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('returns correct eligibility and balance state', () => {
      const { result } = renderHook(() =>
        usePredictActionGuard({
          providerId: 'polymarket',
          navigation: mockNavigation,
        }),
      );

      expect(result.current.isEligible).toBe(true);
      expect(result.current.hasNoBalance).toBe(false);
    });

    it('executes async action and returns promise', async () => {
      const { result } = renderHook(() =>
        usePredictActionGuard({
          providerId: 'polymarket',
          navigation: mockNavigation,
        }),
      );

      const mockAsyncAction = jest.fn().mockResolvedValue('success');

      await act(async () => {
        const promise = result.current.executeGuardedAction(mockAsyncAction);
        expect(promise).toBeInstanceOf(Promise);
        await promise;
      });

      expect(mockAsyncAction).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('when user is not eligible', () => {
    beforeEach(() => {
      mockUsePredictEligibility.mockReturnValue({
        isEligible: false,
        refreshEligibility: jest.fn(),
      });
    });

    it('navigates to unavailable modal and does not execute action', async () => {
      const { result } = renderHook(() =>
        usePredictActionGuard({
          providerId: 'polymarket',
          navigation: mockNavigation,
        }),
      );

      const mockAction = jest.fn();

      await act(async () => {
        await result.current.executeGuardedAction(mockAction);
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('navigates to unavailable modal even with checkBalance option', async () => {
      const { result } = renderHook(() =>
        usePredictActionGuard({
          providerId: 'polymarket',
          navigation: mockNavigation,
        }),
      );

      const mockAction = jest.fn();

      await act(async () => {
        await result.current.executeGuardedAction(mockAction, {
          checkBalance: true,
        });
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('returns correct eligibility state', () => {
      const { result } = renderHook(() =>
        usePredictActionGuard({
          providerId: 'polymarket',
          navigation: mockNavigation,
        }),
      );

      expect(result.current.isEligible).toBe(false);
    });
  });

  describe('when user is eligible but has no balance', () => {
    beforeEach(() => {
      mockUsePredictBalance.mockReturnValue({
        hasNoBalance: true,
      });
    });

    it('executes action when checkBalance is false (default)', async () => {
      const { result } = renderHook(() =>
        usePredictActionGuard({
          providerId: 'polymarket',
          navigation: mockNavigation,
        }),
      );

      const mockAction = jest.fn();

      await act(async () => {
        await result.current.executeGuardedAction(mockAction);
      });

      expect(mockAction).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('calls deposit when checkBalance is true', async () => {
      const { result } = renderHook(() =>
        usePredictActionGuard({
          providerId: 'polymarket',
          navigation: mockNavigation,
        }),
      );

      const mockAction = jest.fn();

      await act(async () => {
        await result.current.executeGuardedAction(mockAction, {
          checkBalance: true,
        });
      });

      expect(mockDeposit).toHaveBeenCalledTimes(1);
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('executes action when checkBalance is true but deposit is pending', async () => {
      mockUsePredictDeposit.mockReturnValue({
        deposit: mockDeposit,
        isDepositPending: true,
      });

      const { result } = renderHook(() =>
        usePredictActionGuard({
          providerId: 'polymarket',
          navigation: mockNavigation,
        }),
      );

      const mockAction = jest.fn();

      await act(async () => {
        await result.current.executeGuardedAction(mockAction, {
          checkBalance: true,
        });
      });

      expect(mockDeposit).not.toHaveBeenCalled();
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('returns correct balance state', () => {
      const { result } = renderHook(() =>
        usePredictActionGuard({
          providerId: 'polymarket',
          navigation: mockNavigation,
        }),
      );

      expect(result.current.hasNoBalance).toBe(true);
    });
  });

  describe('when user is not eligible and has no balance', () => {
    beforeEach(() => {
      mockUsePredictEligibility.mockReturnValue({
        isEligible: false,
        refreshEligibility: jest.fn(),
      });
      mockUsePredictBalance.mockReturnValue({
        hasNoBalance: true,
      });
    });

    it('checks eligibility before balance (navigates to unavailable, not deposit)', async () => {
      const { result } = renderHook(() =>
        usePredictActionGuard({
          providerId: 'polymarket',
          navigation: mockNavigation,
        }),
      );

      const mockAction = jest.fn();

      await act(async () => {
        await result.current.executeGuardedAction(mockAction, {
          checkBalance: true,
        });
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
      expect(mockDeposit).not.toHaveBeenCalled();
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('returns correct eligibility and balance state', () => {
      const { result } = renderHook(() =>
        usePredictActionGuard({
          providerId: 'polymarket',
          navigation: mockNavigation,
        }),
      );

      expect(result.current.isEligible).toBe(false);
      expect(result.current.hasNoBalance).toBe(true);
    });
  });

  describe('providerId usage', () => {
    it('works with different provider IDs', () => {
      const { result } = renderHook(() =>
        usePredictActionGuard({
          providerId: 'custom-provider',
          navigation: mockNavigation,
        }),
      );

      expect(result.current.executeGuardedAction).toBeDefined();
      expect(typeof result.current.executeGuardedAction).toBe('function');
    });
  });

  describe('entryPoint handling for CAROUSEL', () => {
    describe('when user is not eligible and entryPoint is CAROUSEL', () => {
      beforeEach(() => {
        mockUsePredictEligibility.mockReturnValue({
          isEligible: false,
          refreshEligibility: jest.fn(),
        });
      });

      it('navigates through PREDICT.ROOT to unavailable modal', async () => {
        const { result } = renderHook(() =>
          usePredictActionGuard({
            providerId: 'polymarket',
            navigation: mockNavigation,
            entryPoint: PredictEventValues.ENTRY_POINT.CAROUSEL,
          }),
        );

        const mockAction = jest.fn();

        await act(async () => {
          await result.current.executeGuardedAction(mockAction);
        });

        expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MODALS.ROOT,
          params: {
            screen: Routes.PREDICT.MODALS.UNAVAILABLE,
            entryPoint: PredictEventValues.ENTRY_POINT.CAROUSEL,
          },
        });
        expect(mockAction).not.toHaveBeenCalled();
      });
    });

    describe('when user has no balance and entryPoint is CAROUSEL', () => {
      beforeEach(() => {
        mockUsePredictBalance.mockReturnValue({
          hasNoBalance: true,
        });
      });

      it('calls deposit with stack parameter when entryPoint is CAROUSEL', async () => {
        const { result } = renderHook(() =>
          usePredictActionGuard({
            providerId: 'polymarket',
            navigation: mockNavigation,
            entryPoint: PredictEventValues.ENTRY_POINT.CAROUSEL,
          }),
        );

        const mockAction = jest.fn();

        await act(async () => {
          await result.current.executeGuardedAction(mockAction, {
            checkBalance: true,
          });
        });

        expect(mockDeposit).toHaveBeenCalledTimes(1);
        expect(mockAction).not.toHaveBeenCalled();
      });

      it('calls deposit when entryPoint is not CAROUSEL', async () => {
        const { result } = renderHook(() =>
          usePredictActionGuard({
            providerId: 'polymarket',
            navigation: mockNavigation,
            entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
          }),
        );

        const mockAction = jest.fn();

        await act(async () => {
          await result.current.executeGuardedAction(mockAction, {
            checkBalance: true,
          });
        });

        expect(mockDeposit).toHaveBeenCalledTimes(1);
        expect(mockAction).not.toHaveBeenCalled();
      });
    });

    describe('usePredictDeposit is called with correct providerId', () => {
      it('passes providerId to usePredictDeposit', () => {
        renderHook(() =>
          usePredictActionGuard({
            providerId: 'polymarket',
            navigation: mockNavigation,
            entryPoint: PredictEventValues.ENTRY_POINT.CAROUSEL,
          }),
        );

        expect(mockUsePredictDeposit).toHaveBeenCalledWith({
          providerId: 'polymarket',
        });
      });
    });
  });
});
