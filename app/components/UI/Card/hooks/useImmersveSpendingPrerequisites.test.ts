import { renderHook, act } from '@testing-library/react-hooks';
import Engine from '../../../../core/Engine';
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
  });

  it('polls while pending and stops once actionable', async () => {
    jest.useFakeTimers();
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

    // No longer 'pending' → poll stops (funding requires explicit user action,
    // not background polling).
    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(mockCard.getSpendingPrerequisites).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
