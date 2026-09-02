import { act, renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import type {
  EarningOriginType,
  EarningsLedgerPageDto,
  LedgerEntryDto,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { useEarningsLedger } from './useEarningsLedger';

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: { controllerMessenger: { call: jest.fn() } },
}));

jest.mock('../../constants', () => ({
  ...jest.requireActual('../../constants'),
  REWARDS_MONEY_ENABLED: true,
}));

const mockCall = jest.mocked(Engine.controllerMessenger.call);

const createEntry = (id: string): LedgerEntryDto => ({
  id,
  earning_origin_type: 'CASHBACK',
  musd_amount: '1000000',
  fee_amount_usd: '2.00',
  entry_count: 1,
  transaction_hash: null,
  chain_id: null,
  ledger_timestamp: '2026-09-01T00:00:00.000Z',
  claim_status: 'UNCLAIMED',
  claim_expires_at: null,
  swaps_source: null,
  perps_source: null,
});

const createPage = (
  overrides: Partial<EarningsLedgerPageDto> = {},
): EarningsLedgerPageDto => ({
  results: [createEntry('entry-1')],
  has_more: false,
  cursor: null,
  ...overrides,
});

describe('useEarningsLedger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCall.mockResolvedValue(createPage() as never);
  });

  it('fetches the first page for the given scope with no cursor', async () => {
    const { result } = renderHook(() => useEarningsLedger(['CASHBACK']));

    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getEarningsLedger',
      { originTypes: ['CASHBACK'], cursor: null, forceFresh: false },
    );
  });

  it('appends a cursor page to the rows already shown', async () => {
    mockCall.mockResolvedValueOnce(
      createPage({ has_more: true, cursor: 'cursor-2' }) as never,
    );
    mockCall.mockResolvedValueOnce(
      createPage({ results: [createEntry('entry-2')] }) as never,
    );
    const { result } = renderHook(() => useEarningsLedger(['CASHBACK']));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    expect(mockCall).toHaveBeenLastCalledWith(
      'RewardsMoneyController:getEarningsLedger',
      {
        originTypes: ['CASHBACK'],
        cursor: 'cursor-2',
        forceFresh: undefined,
      },
    );
  });

  it('restarts the list when the scope contents change', async () => {
    const { result, rerender } = renderHook(
      ({ scope }: { scope: EarningOriginType[] }) => useEarningsLedger(scope),
      { initialProps: { scope: ['CASHBACK'] as EarningOriginType[] } },
    );
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    rerender({
      scope: ['CASHBACK', 'REFERRAL_REV_SHARE'] as EarningOriginType[],
    });

    await waitFor(() => expect(mockCall).toHaveBeenCalledTimes(2));
  });

  it('sends an empty scope through as an empty array, meaning all types', async () => {
    const { result } = renderHook(() => useEarningsLedger([]));

    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getEarningsLedger',
      { originTypes: [], cursor: null, forceFresh: false },
    );
  });

  it('surfaces the failure message when the first page rejects', async () => {
    mockCall.mockRejectedValue(new Error('Ledger unavailable'));

    const { result } = renderHook(() => useEarningsLedger(['CASHBACK']));

    await waitFor(() =>
      expect(result.current.error).toBe('Ledger unavailable'),
    );
  });
});
