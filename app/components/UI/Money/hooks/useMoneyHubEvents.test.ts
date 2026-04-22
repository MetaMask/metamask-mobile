import { renderHook } from '@testing-library/react-hooks';
import useMoneyHubEvents from './useMoneyHubEvents';
import { MONEY_EVENTS_CONSTANTS } from '../constants/moneyEvents';
import { useMusdBalance } from '../../Earn/hooks/useMusdBalance';

jest.mock('../../Earn/hooks/useMusdBalance');

const mockUseMusdBalance = jest.mocked(useMusdBalance);

const { MONEY_HUB_STATES } = MONEY_EVENTS_CONSTANTS;

describe('useMoneyHubEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns filled when user has mUSD balance on any chain', () => {
    mockUseMusdBalance.mockReturnValue({
      hasMusdBalanceOnAnyChain: true,
    } as ReturnType<typeof useMusdBalance>);

    const { result } = renderHook(() => useMoneyHubEvents());

    expect(result.current.moneyHubFilledState).toBe(MONEY_HUB_STATES.FILLED);
  });

  it('returns empty when user has no mUSD balance', () => {
    mockUseMusdBalance.mockReturnValue({
      hasMusdBalanceOnAnyChain: false,
    } as ReturnType<typeof useMusdBalance>);

    const { result } = renderHook(() => useMoneyHubEvents());

    expect(result.current.moneyHubFilledState).toBe(MONEY_HUB_STATES.EMPTY);
  });
});
