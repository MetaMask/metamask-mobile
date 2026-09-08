import { act, renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import type {
  ClaimDto,
  ClaimHistoryPageDto,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { useClaimHistory } from './useClaimHistory';

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: { controllerMessenger: { call: jest.fn() } },
}));

jest.mock('../../constants', () => ({
  ...jest.requireActual('../../constants'),
  REWARDS_MONEY_ENABLED: true,
}));

const mockCall = jest.mocked(Engine.controllerMessenger.call);

const createClaim = (id: string): ClaimDto =>
  ({
    id,
    money_account_address: '0xmoneyaccount',
    earning_origin_types: ['REFERRAL_REV_SHARE'],
    gross_amount: '200000',
    withheld_amount: '0',
    net_amount: '200000',
    withholding_rate_bps: 0,
    valid_before: null,
    status: 'SETTLED',
    created_at: '2026-09-07T10:00:00.000Z',
    settled_tx_hash: '0xhash',
    settled_at: '2026-09-07T10:01:00.000Z',
  }) as ClaimDto;

const createPage = (
  overrides: Partial<ClaimHistoryPageDto> = {},
): ClaimHistoryPageDto => ({
  results: [createClaim('claim-1')],
  has_more: false,
  cursor: null,
  ...overrides,
});

describe('useClaimHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the first page with no cursor', async () => {
    mockCall.mockResolvedValue(createPage() as never);

    const { result } = renderHook(() => useClaimHistory());

    await waitFor(() => expect(result.current.claims).toHaveLength(1));
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getClaimHistory',
      { cursor: null },
    );
  });

  it('carries the cursor on a later page and merges the results', async () => {
    mockCall
      .mockResolvedValueOnce(
        createPage({ has_more: true, cursor: 'cursor-1' }) as never,
      )
      .mockResolvedValueOnce(
        createPage({ results: [createClaim('claim-2')] }) as never,
      );

    const { result } = renderHook(() => useClaimHistory());
    await waitFor(() => expect(result.current.claims).toHaveLength(1));

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.claims).toHaveLength(2));
    expect(mockCall).toHaveBeenLastCalledWith(
      'RewardsMoneyController:getClaimHistory',
      { cursor: 'cursor-1' },
    );
  });

  it('surfaces a failed read as an error rather than an empty list', async () => {
    mockCall.mockRejectedValue(new Error('Claims unavailable'));

    const { result } = renderHook(() => useClaimHistory());

    await waitFor(() =>
      expect(result.current.error).toBe('Claims unavailable'),
    );
  });
});
