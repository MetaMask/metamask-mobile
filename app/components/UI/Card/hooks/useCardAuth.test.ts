import { renderHook, act } from '@testing-library/react-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { cardQueries } from '../queries';
import { useCardAuth } from './useCardAuth';

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      initiateAuth: jest.fn(),
      submitCredentials: jest.fn(),
      executeStepAction: jest.fn(),
      logout: jest.fn(),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockUseMutation = useMutation as jest.Mock;
const mockUseQueryClient = useQueryClient as jest.Mock;
const mockController = Engine.context.CardController as jest.Mocked<
  typeof Engine.context.CardController
>;

const mockInvalidateQueries = jest.fn();
const mockRemoveQueries = jest.fn();

describe('useCardAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseQueryClient.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
      removeQueries: mockRemoveQueries,
    });

    mockUseMutation.mockImplementation(
      (opts: {
        mutationFn: (...args: unknown[]) => Promise<unknown>;
        onSuccess?: (result: unknown) => void;
      }) => ({
        mutateAsync: jest.fn(async (...args: unknown[]) => {
          const res = await opts.mutationFn(...args);
          opts.onSuccess?.(res);
          return res;
        }),
        isPending: false,
        error: null,
        data: null,
      }),
    );
  });

  it('currentStep starts as email_password', () => {
    const { result } = renderHook(() => useCardAuth());

    expect(result.current.currentStep).toStrictEqual({
      type: 'email_password',
    });
  });

  it('exposes getErrorMessage for displaying auth errors', () => {
    const { result } = renderHook(() => useCardAuth());

    expect(result.current.getErrorMessage).toBeDefined();
    expect(typeof result.current.getErrorMessage).toBe('function');
  });

  describe('initiate', () => {
    it('calls controller.initiateAuth', async () => {
      mockController.initiateAuth.mockResolvedValue(undefined);
      const { result } = renderHook(() => useCardAuth());

      await act(async () => {
        await result.current.initiate.mutateAsync('US');
      });

      expect(mockController.initiateAuth).toHaveBeenCalledWith('US');
    });
  });

  describe('submit', () => {
    it('calls controller.submitCredentials with credentials', async () => {
      mockController.submitCredentials.mockResolvedValue({
        done: true,
        tokenSet: {} as never,
      });
      const { result } = renderHook(() => useCardAuth());

      await act(async () => {
        await result.current.submit.mutateAsync({
          type: 'email_password',
          email: 'a@b.com',
          password: 'p',
        });
      });

      expect(mockController.submitCredentials).toHaveBeenCalledWith({
        type: 'email_password',
        email: 'a@b.com',
        password: 'p',
      });
    });

    it('resets currentStep and invalidates queries on done:true', async () => {
      mockController.submitCredentials.mockResolvedValue({ done: true });
      const { result } = renderHook(() => useCardAuth());

      await act(async () => {
        await result.current.submit.mutateAsync({
          type: 'email_password',
          email: 'a@b.com',
          password: 'p',
        });
      });

      expect(result.current.currentStep).toStrictEqual({
        type: 'email_password',
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: cardQueries.keys.all(),
      });
    });

    it('updates currentStep when nextStep is returned', async () => {
      mockController.submitCredentials.mockResolvedValue({
        done: false,
        nextStep: { type: 'otp', destination: '+1555****90' },
      });
      const { result } = renderHook(() => useCardAuth());

      await act(async () => {
        await result.current.submit.mutateAsync({
          type: 'email_password',
          email: 'a@b.com',
          password: 'p',
        });
      });

      expect(result.current.currentStep).toStrictEqual({
        type: 'otp',
        destination: '+1555****90',
      });
    });

    it('resets currentStep when onboardingRequired is returned', async () => {
      mockController.submitCredentials.mockResolvedValue({
        done: false,
        onboardingRequired: { sessionId: 'ob-1', phase: 'kyc' },
      });
      const { result } = renderHook(() => useCardAuth());

      await act(async () => {
        await result.current.submit.mutateAsync({
          type: 'email_password',
          email: 'a@b.com',
          password: 'p',
        });
      });

      expect(result.current.currentStep).toStrictEqual({
        type: 'email_password',
      });
    });

    it('resets currentStep when done:false without nextStep or onboardingRequired', async () => {
      mockController.submitCredentials.mockResolvedValue({ done: false });
      const { result } = renderHook(() => useCardAuth());

      await act(async () => {
        await result.current.submit.mutateAsync({
          type: 'email_password',
          email: 'a@b.com',
          password: 'p',
        });
      });

      expect(result.current.currentStep).toStrictEqual({
        type: 'email_password',
      });
    });
  });

  describe('stepAction', () => {
    it('calls controller.executeStepAction', async () => {
      mockController.executeStepAction.mockResolvedValue(undefined);
      const { result } = renderHook(() => useCardAuth());

      await act(async () => {
        await result.current.stepAction.mutateAsync();
      });

      expect(mockController.executeStepAction).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('calls controller.logout', async () => {
      mockController.logout.mockResolvedValue(undefined);
      const { result } = renderHook(() => useCardAuth());

      await act(async () => {
        await result.current.logout.mutateAsync();
      });

      expect(mockController.logout).toHaveBeenCalled();
    });

    it('resets currentStep and removes queries on success', async () => {
      mockController.submitCredentials.mockResolvedValue({
        done: false,
        nextStep: { type: 'otp', destination: '+1555****90' },
      });
      mockController.logout.mockResolvedValue(undefined);
      const { result } = renderHook(() => useCardAuth());

      await act(async () => {
        await result.current.submit.mutateAsync({
          type: 'email_password',
          email: 'a@b.com',
          password: 'p',
        });
      });
      expect(result.current.currentStep).toStrictEqual({
        type: 'otp',
        destination: '+1555****90',
      });

      await act(async () => {
        await result.current.logout.mutateAsync();
      });

      expect(result.current.currentStep).toStrictEqual({
        type: 'email_password',
      });
      expect(mockRemoveQueries).toHaveBeenCalledWith({
        queryKey: cardQueries.keys.all(),
      });
    });
  });
});
