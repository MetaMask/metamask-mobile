import { act, renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import type {
  EarningOriginType,
  EarningsSummaryDto,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { useEarningsSummary } from './useEarningsSummary';

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: { controllerMessenger: { call: jest.fn() } },
}));

jest.mock('../../hooks/useRewardsMoneyEvents', () => ({
  __esModule: true,
  default: jest.fn(),
  useRewardsMoneyEvents: jest.fn(),
}));

jest.mock('../../constants', () => ({
  ...jest.requireActual('../../constants'),
  REWARDS_MONEY_ENABLED: true,
}));

const mockCall = jest.mocked(Engine.controllerMessenger.call);

const createSummary = (
  overrides: Partial<EarningsSummaryDto> = {},
): EarningsSummaryDto => ({
  lifetime_total: '0',
  claimable: '0',
  pending: '0',
  claimed: '0',
  forfeited: '0',
  minimum_musd_base_units: '10000000',
  by_earning_origin_type: {},
  ...overrides,
});

const REFERRER_SCOPE: EarningOriginType[] = ['CASHBACK', 'REFERRAL_REV_SHARE'];

describe('useEarningsSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCall.mockResolvedValue(createSummary() as never);
  });

  it('requests the summary for the given origin-type scope', async () => {
    const { result } = renderHook(() => useEarningsSummary(REFERRER_SCOPE));

    await waitFor(() => expect(result.current.summary).not.toBeNull());
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getEarningsSummary',
      { originTypes: REFERRER_SCOPE, forceFresh: false },
    );
  });

  it('does not refetch when the caller passes a new array with the same members', async () => {
    const { result, rerender } = renderHook(
      ({ scope }: { scope: EarningOriginType[] }) => useEarningsSummary(scope),
      { initialProps: { scope: ['CASHBACK'] as EarningOriginType[] } },
    );
    await waitFor(() => expect(result.current.summary).not.toBeNull());

    rerender({ scope: ['CASHBACK'] as EarningOriginType[] });

    expect(mockCall).toHaveBeenCalledTimes(1);
  });

  it('refetches when the scope contents change', async () => {
    const { result, rerender } = renderHook(
      ({ scope }: { scope: EarningOriginType[] }) => useEarningsSummary(scope),
      { initialProps: { scope: ['CASHBACK'] as EarningOriginType[] } },
    );
    await waitFor(() => expect(result.current.summary).not.toBeNull());

    rerender({ scope: REFERRER_SCOPE });

    await waitFor(() => expect(mockCall).toHaveBeenCalledTimes(2));
  });

  it('sends an empty scope through as an empty array, meaning all types', async () => {
    const { result } = renderHook(() => useEarningsSummary([]));

    await waitFor(() => expect(result.current.summary).not.toBeNull());
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getEarningsSummary',
      { originTypes: [], forceFresh: false },
    );
  });

  it('surfaces the failure message when the read rejects', async () => {
    mockCall.mockRejectedValue(new Error('Summary unavailable'));

    const { result } = renderHook(() => useEarningsSummary(['CASHBACK']));

    await waitFor(() =>
      expect(result.current.error).toBe('Summary unavailable'),
    );
  });

  it('falls back to a generic message when the rejection is not an Error', async () => {
    mockCall.mockRejectedValue('socket closed');

    const { result } = renderHook(() => useEarningsSummary(['CASHBACK']));

    await waitFor(() => expect(result.current.error).toBe('Failed to load'));
  });

  it('does not set state after the screen has unmounted', async () => {
    let release: (value: unknown) => void = () => undefined;
    mockCall.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }) as never,
    );
    const { result, unmount } = renderHook(() =>
      useEarningsSummary(['CASHBACK']),
    );

    unmount();
    await act(async () => {
      release(createSummary());
    });

    expect(result.current.summary).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('refetches with forceFresh when refresh is called', async () => {
    const { result } = renderHook(() => useEarningsSummary(['CASHBACK']));
    await waitFor(() => expect(result.current.summary).not.toBeNull());

    await act(async () => {
      result.current.refresh();
    });

    expect(mockCall).toHaveBeenLastCalledWith(
      'RewardsMoneyController:getEarningsSummary',
      { originTypes: ['CASHBACK'], forceFresh: true },
    );
  });
});
