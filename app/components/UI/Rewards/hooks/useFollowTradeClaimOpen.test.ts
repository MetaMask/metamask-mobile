import { renderHook, act } from '@testing-library/react-hooks';
import { useFollowTradeClaimOpen } from './useFollowTradeClaimOpen';

const mockDispatch = jest.fn();
const mockCall = jest.fn();
let mockStoredMechanisms:
  | { SOCIAL_FOLLOW_TRADE: { claim_open: boolean } }
  | undefined;

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../reducers/rewardsMoney/selectors', () => ({
  selectCommissionMechanisms: jest.fn(() => mockStoredMechanisms),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockCall(...args),
    },
  },
}));

describe('useFollowTradeClaimOpen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoredMechanisms = undefined;
    mockCall.mockResolvedValue({
      mechanisms: {
        SOCIAL_FOLLOW_TRADE: { claim_open: true, reason: null },
      },
    });
  });

  it('stays closed until a commissions page is stored', async () => {
    const { result } = renderHook(() => useFollowTradeClaimOpen('profile-a'));

    expect(result.current).toBe(false);
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getCommissions',
      { originType: 'SOCIAL_FOLLOW_TRADE' },
    );
  });

  it('does not fetch when this session already stored the page', () => {
    mockStoredMechanisms = {
      SOCIAL_FOLLOW_TRADE: { claim_open: true },
    };

    const { result } = renderHook(() => useFollowTradeClaimOpen('profile-a'));

    expect(result.current).toBe(true);
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('stays closed without a profile', () => {
    const { result } = renderHook(() => useFollowTradeClaimOpen(undefined));

    expect(result.current).toBe(false);
    expect(mockCall).not.toHaveBeenCalled();
  });
});
