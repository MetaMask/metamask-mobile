import { renderHook, act } from '@testing-library/react-hooks';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { useImmersveSpendingPrerequisites } from './useImmersveSpendingPrerequisites';

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      getSpendingPrerequisites: jest.fn(),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({ error: jest.fn() }));

const mockCard = Engine.context.CardController as jest.Mocked<
  typeof Engine.context.CardController
>;

describe('useImmersveSpendingPrerequisites', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does nothing without a fundingSourceId', async () => {
    const { result } = renderHook(() =>
      useImmersveSpendingPrerequisites({ kycRegion: 'GB' }),
    );

    let action;
    await act(async () => {
      action = await result.current.refresh();
    });

    expect(action).toBeNull();
    expect(mockCard.getSpendingPrerequisites).not.toHaveBeenCalled();
  });

  it('fetches prerequisites and derives the next action', async () => {
    mockCard.getSpendingPrerequisites.mockResolvedValue({
      prerequisites: [
        {
          stage: 'kyc',
          status: 'action-required',
          actionType: 'follow_kyc_url',
          params: { kycUrl: 'https://verify.immersve.com' },
        },
      ],
    });

    const { result } = renderHook(() =>
      useImmersveSpendingPrerequisites({
        fundingSourceId: 'fs-1',
        kycRegion: 'GB',
      }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockCard.getSpendingPrerequisites).toHaveBeenCalledWith('fs-1', {
      kycRegion: 'GB',
      kycRedirectUrl: undefined,
    });
    expect(result.current.nextAction).toStrictEqual({
      type: 'kyc',
      url: 'https://verify.immersve.com',
      ctaHint: undefined,
    });
  });

  it('resolves to null and records the error without throwing on failure', async () => {
    mockCard.getSpendingPrerequisites.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() =>
      useImmersveSpendingPrerequisites({
        fundingSourceId: 'fs-1',
        kycRegion: 'GB',
      }),
    );

    let action;
    await act(async () => {
      // Must not throw — a throw here (or in the setState updater) crashed the
      // KYC processing screen with a render error.
      action = await result.current.refresh();
    });

    expect(action).toBeNull();
    expect(result.current.nextAction).toBeNull();
    expect(result.current.error).toBeTruthy();
    // Provider owns Sentry for API failures; hook must not double-report.
    expect(Logger.error).not.toHaveBeenCalled();
  });

  describe('polling while pending', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('polls while pending and stops once actionable', async () => {
      mockCard.getSpendingPrerequisites
        .mockResolvedValueOnce({
          prerequisites: [{ stage: 'aml', status: 'pending' }],
        })
        .mockResolvedValueOnce({
          prerequisites: [
            {
              stage: 'funding',
              status: 'action-required',
              actionType: 'smart_contract_write',
              params: {
                abi: [],
                contractAddress: '0xT',
                method: 'approve',
                params: { _spender: '0xS', _value: '1' },
              },
            },
          ],
        });

      const { result } = renderHook(() =>
        useImmersveSpendingPrerequisites({
          fundingSourceId: 'fs-1',
          pollIntervalMs: 1000,
        }),
      );

      await act(async () => {
        await result.current.refresh();
      });
      expect(result.current.nextAction?.type).toBe('pending');

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(mockCard.getSpendingPrerequisites).toHaveBeenCalledTimes(2);
      expect(result.current.nextAction?.type).toBe('funding');

      await act(async () => {
        jest.advanceTimersByTime(5000);
        await Promise.resolve();
      });
      expect(mockCard.getSpendingPrerequisites).toHaveBeenCalledTimes(2);
    });

    it('backs off after a failure then auto-retries after cooldown', async () => {
      mockCard.getSpendingPrerequisites
        .mockResolvedValueOnce({
          prerequisites: [{ stage: 'aml', status: 'pending' }],
        })
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({
          prerequisites: [
            {
              stage: 'funding',
              status: 'action-required',
              actionType: 'smart_contract_write',
              params: {
                abi: [],
                contractAddress: '0xT',
                method: 'approve',
                params: { _spender: '0xS', _value: '1' },
              },
            },
          ],
        });

      const { result } = renderHook(() =>
        useImmersveSpendingPrerequisites({
          fundingSourceId: 'fs-1',
          pollIntervalMs: 1000,
        }),
      );

      await act(async () => {
        await result.current.refresh();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(result.current.error).toBeTruthy();
      expect(mockCard.getSpendingPrerequisites).toHaveBeenCalledTimes(2);

      // Fast interval must not fire while error is set.
      await act(async () => {
        jest.advanceTimersByTime(5000);
        await Promise.resolve();
      });
      expect(mockCard.getSpendingPrerequisites).toHaveBeenCalledTimes(2);

      // Cooldown retry (15s) recovers.
      await act(async () => {
        jest.advanceTimersByTime(15000);
        await Promise.resolve();
      });

      expect(mockCard.getSpendingPrerequisites).toHaveBeenCalledTimes(3);
      expect(result.current.error).toBeNull();
      expect(result.current.nextAction?.type).toBe('funding');
    });

    it('does not restart fast polling while a cooldown retry is in flight', async () => {
      let resolveRetry: (value: {
        prerequisites: { stage: string; status: string }[];
      }) => void = () => undefined;
      const retryPromise = new Promise<{
        prerequisites: { stage: string; status: string }[];
      }>((resolve) => {
        resolveRetry = resolve;
      });

      mockCard.getSpendingPrerequisites
        .mockResolvedValueOnce({
          prerequisites: [{ stage: 'aml', status: 'pending' }],
        })
        .mockRejectedValueOnce(new Error('boom'))
        .mockImplementationOnce(() => retryPromise);

      const { result } = renderHook(() =>
        useImmersveSpendingPrerequisites({
          fundingSourceId: 'fs-1',
          pollIntervalMs: 1000,
        }),
      );

      await act(async () => {
        await result.current.refresh();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });
      expect(result.current.error).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(15000);
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(true);
      expect(mockCard.getSpendingPrerequisites).toHaveBeenCalledTimes(3);

      // Fast interval must stay off while the cooldown refresh is in flight.
      await act(async () => {
        jest.advanceTimersByTime(5000);
        await Promise.resolve();
      });
      expect(mockCard.getSpendingPrerequisites).toHaveBeenCalledTimes(3);

      await act(async () => {
        resolveRetry({
          prerequisites: [{ stage: 'aml', status: 'pending' }],
        });
        await retryPromise;
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('stops auto-retry after max consecutive poll failures', async () => {
      mockCard.getSpendingPrerequisites
        .mockResolvedValueOnce({
          prerequisites: [{ stage: 'aml', status: 'pending' }],
        })
        .mockRejectedValue(new Error('boom'));

      const { result } = renderHook(() =>
        useImmersveSpendingPrerequisites({
          fundingSourceId: 'fs-1',
          pollIntervalMs: 1000,
        }),
      );

      await act(async () => {
        await result.current.refresh();
      });

      // Failure 1 via interval
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });
      // Failure 2 via cooldown
      await act(async () => {
        jest.advanceTimersByTime(15000);
        await Promise.resolve();
      });
      // Failure 3 via cooldown
      await act(async () => {
        jest.advanceTimersByTime(15000);
        await Promise.resolve();
      });

      const callsAfterMax = mockCard.getSpendingPrerequisites.mock.calls.length;
      expect(result.current.error).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(60000);
        await Promise.resolve();
      });
      expect(mockCard.getSpendingPrerequisites).toHaveBeenCalledTimes(
        callsAfterMax,
      );
    });
  });
});
