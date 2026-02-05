import { renderHook, act } from '@testing-library/react-hooks';
import Routes from '../../../../constants/navigation/Routes';
import { usePredictActionGuard } from './usePredictActionGuard';

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const mockUsePredictEligibility = jest.fn();
jest.mock('./usePredictEligibility', () => ({
  usePredictEligibility: () => mockUsePredictEligibility(),
}));

describe('usePredictActionGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictEligibility.mockReturnValue({
      isEligible: true,
      refreshEligibility: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when user is eligible', () => {
    it('executes action without navigation', async () => {
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

    it('returns correct eligibility state', () => {
      const { result } = renderHook(() =>
        usePredictActionGuard({
          providerId: 'polymarket',
          navigation: mockNavigation,
        }),
      );

      expect(result.current.isEligible).toBe(true);
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
});
