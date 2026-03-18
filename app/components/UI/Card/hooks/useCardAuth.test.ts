import { renderHook, act } from '@testing-library/react-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { cardQueries } from '../queries';
import { useCardAuth } from './useCardAuth';
import type { CardAuthSession } from '../../../../core/Engine/controllers/card-controller/provider-types';

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      initiateAuth: jest.fn(),
      submitCredentials: jest.fn(),
      sendOtp: jest.fn(),
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

const mockSession: CardAuthSession = {
  id: 'session-1',
  currentStep: { type: 'email_password' },
  _metadata: {
    initiateToken: 'tok',
    location: 'international',
    state: 's',
    codeVerifier: 'cv',
  },
};

describe('useCardAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseQueryClient.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
      removeQueries: mockRemoveQueries,
    });

    // Simulate React Query: call mutationFn then onSuccess, so tests flow naturally
    // through result.current.*.mutateAsync — same pattern as useCardPinToken.test.ts
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

  it('session starts as null', () => {
    const { result } = renderHook(() => useCardAuth());

    expect(result.current.session).toBeNull();
  });

  describe('initiate', () => {
    it('calls controller.initiateAuth and sets session on success', async () => {
      mockController.initiateAuth.mockResolvedValue(mockSession);
      const { result } = renderHook(() => useCardAuth());

      await act(async () => {
        await result.current.initiate.mutateAsync('US');
      });

      expect(mockController.initiateAuth).toHaveBeenCalledWith('US');
      expect(result.current.session).toBe(mockSession);
    });
  });

  describe('submit', () => {
    it('throws when session is null', async () => {
      const { result } = renderHook(() => useCardAuth());

      await expect(
        result.current.submit.mutateAsync({
          type: 'email_password',
          email: 'a@b.com',
          password: 'p',
        }),
      ).rejects.toThrow('No active auth session');
    });

    it('calls controller.submitCredentials with the active session', async () => {
      mockController.initiateAuth.mockResolvedValue(mockSession);
      mockController.submitCredentials.mockResolvedValue({
        done: true,
        tokenSet: {} as never,
      });
      const { result } = renderHook(() => useCardAuth());

      await act(async () => {
        await result.current.initiate.mutateAsync('US');
      });
      await act(async () => {
        await result.current.submit.mutateAsync({
          type: 'email_password',
          email: 'a@b.com',
          password: 'p',
        });
      });

      expect(mockController.submitCredentials).toHaveBeenCalledWith(
        mockSession,
        {
          type: 'email_password',
          email: 'a@b.com',
          password: 'p',
        },
      );
    });

    it('clears session and invalidates queries on done:true', async () => {
      mockController.initiateAuth.mockResolvedValue(mockSession);
      mockController.submitCredentials.mockResolvedValue({ done: true });
      const { result } = renderHook(() => useCardAuth());

      await act(async () => {
        await result.current.initiate.mutateAsync('US');
      });
      expect(result.current.session).toBe(mockSession);

      await act(async () => {
        await result.current.submit.mutateAsync({
          type: 'email_password',
          email: 'a@b.com',
          password: 'p',
        });
      });

      expect(result.current.session).toBeNull();
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: cardQueries.keys.all(),
      });
    });

    it('updates session.currentStep when nextStep is returned', async () => {
      mockController.initiateAuth.mockResolvedValue(mockSession);
      mockController.submitCredentials.mockResolvedValue({
        done: false,
        nextStep: { type: 'otp', destination: '+1555****90' },
      });
      const { result } = renderHook(() => useCardAuth());

      await act(async () => {
        await result.current.initiate.mutateAsync('US');
      });
      await act(async () => {
        await result.current.submit.mutateAsync({
          type: 'email_password',
          email: 'a@b.com',
          password: 'p',
        });
      });

      expect(result.current.session?.currentStep).toStrictEqual({
        type: 'otp',
        destination: '+1555****90',
      });
    });

    it('clears session when onboardingRequired is returned', async () => {
      mockController.initiateAuth.mockResolvedValue(mockSession);
      mockController.submitCredentials.mockResolvedValue({
        done: false,
        onboardingRequired: { sessionId: 'ob-1', phase: 'kyc' },
      });
      const { result } = renderHook(() => useCardAuth());

      await act(async () => {
        await result.current.initiate.mutateAsync('US');
      });
      expect(result.current.session).toBe(mockSession);

      await act(async () => {
        await result.current.submit.mutateAsync({
          type: 'email_password',
          email: 'a@b.com',
          password: 'p',
        });
      });

      expect(result.current.session).toBeNull();
    });
  });

  describe('sendOtp', () => {
    it('throws when session is null', async () => {
      const { result } = renderHook(() => useCardAuth());

      await expect(result.current.sendOtp.mutateAsync()).rejects.toThrow(
        'No active auth session',
      );
    });

    it('calls controller.sendOtp with the active session', async () => {
      mockController.initiateAuth.mockResolvedValue(mockSession);
      mockController.sendOtp.mockResolvedValue(undefined);
      const { result } = renderHook(() => useCardAuth());

      await act(async () => {
        await result.current.initiate.mutateAsync('US');
      });
      await act(async () => {
        await result.current.sendOtp.mutateAsync();
      });

      expect(mockController.sendOtp).toHaveBeenCalledWith(mockSession);
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

    it('clears session and removes queries on success', async () => {
      mockController.initiateAuth.mockResolvedValue(mockSession);
      mockController.logout.mockResolvedValue(undefined);
      const { result } = renderHook(() => useCardAuth());

      await act(async () => {
        await result.current.initiate.mutateAsync('US');
      });
      expect(result.current.session).toBe(mockSession);

      await act(async () => {
        await result.current.logout.mutateAsync();
      });

      expect(result.current.session).toBeNull();
      expect(mockRemoveQueries).toHaveBeenCalledWith({
        queryKey: cardQueries.keys.all(),
      });
    });
  });
});
