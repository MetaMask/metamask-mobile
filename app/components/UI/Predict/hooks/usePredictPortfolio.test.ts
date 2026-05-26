import { renderHook } from '@testing-library/react-native';
import { PredictPosition, PredictPositionStatus } from '../types';
import { usePredictPortfolio } from './usePredictPortfolio';

const mockUsePredictBalance = jest.fn();
const mockUsePredictPositions = jest.fn();
const mockUsePredictClaim = jest.fn();
const mockUsePredictDeposit = jest.fn();
const mockUsePredictWithdraw = jest.fn();
const mockUsePredictAccountState = jest.fn();

jest.mock('./usePredictBalance', () => ({
  usePredictBalance: () => mockUsePredictBalance(),
}));

jest.mock('./usePredictPositions', () => ({
  usePredictPositions: (options: unknown) => mockUsePredictPositions(options),
}));

jest.mock('./usePredictClaim', () => ({
  usePredictClaim: () => mockUsePredictClaim(),
}));

jest.mock('./usePredictDeposit', () => ({
  usePredictDeposit: () => mockUsePredictDeposit(),
}));

jest.mock('./usePredictWithdraw', () => ({
  usePredictWithdraw: () => mockUsePredictWithdraw(),
}));

jest.mock('./usePredictAccountState', () => ({
  usePredictAccountState: (options: unknown) =>
    mockUsePredictAccountState(options),
}));

const createPosition = (
  id: string,
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  amount: 10,
  avgPrice: 1,
  cashPnl: 0,
  claimable: false,
  currentValue: 100,
  endDate: '2026-01-01T00:00:00Z',
  icon: 'icon',
  id,
  initialValue: 100,
  marketId: `market-${id}`,
  outcome: 'Yes',
  outcomeId: `outcome-${id}`,
  outcomeIndex: 0,
  outcomeTokenId: `token-${id}`,
  percentPnl: 0,
  price: 1,
  providerId: 'provider',
  size: 10,
  status: PredictPositionStatus.OPEN,
  title: `Market ${id}`,
  ...overrides,
});

const createQuery = <T>(overrides: Partial<Record<string, unknown>> = {}) => ({
  data: undefined as T | undefined,
  error: null,
  isLoading: false,
  isRefetching: false,
  refetch: jest.fn(),
  ...overrides,
});

describe('usePredictPortfolio', () => {
  const mockClaim = jest.fn();
  const mockDeposit = jest.fn();
  const mockWithdraw = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUsePredictBalance.mockReturnValue(createQuery<number>({ data: 0 }));
    mockUsePredictPositions.mockImplementation(
      ({ claimable }: { claimable?: boolean }) =>
        createQuery<PredictPosition[]>({
          data: claimable ? [] : [],
        }),
    );
    mockUsePredictClaim.mockReturnValue({
      claim: mockClaim,
      isClaimPending: false,
    });
    mockUsePredictDeposit.mockReturnValue({
      deposit: mockDeposit,
      isDepositPending: false,
    });
    mockUsePredictWithdraw.mockReturnValue({
      withdraw: mockWithdraw,
      withdrawTransaction: undefined,
    });
    mockUsePredictAccountState.mockReturnValue(
      createQuery({
        data: undefined,
      }),
    );
  });

  it('returns the first-time zero portfolio state', () => {
    const { result } = renderHook(() => usePredictPortfolio());

    expect(result.current.portfolioValue).toBe(0);
    expect(result.current.availableBalance).toBe(0);
    expect(result.current.showPnlLine).toBe(false);
    expect(result.current.showUnrealizedPnl).toBe(false);
    expect(result.current.totalUnrealizedPnlPercent).toBeUndefined();
    expect(result.current.openPositionCount).toBe(0);
    expect(result.current.claimablePositionCount).toBe(0);
    expect(result.current.positionsBadgeCount).toBe(0);
    expect(result.current.hasClaimableWinnings).toBe(false);
  });

  it('returns a usable balance-only portfolio state', () => {
    mockUsePredictBalance.mockReturnValue(createQuery<number>({ data: 250 }));

    const { result } = renderHook(() => usePredictPortfolio());

    expect(result.current.portfolioValue).toBe(250);
    expect(result.current.availableBalance).toBe(250);
    expect(result.current.openPositionCount).toBe(0);
    expect(result.current.claimablePositionCount).toBe(0);
    expect(result.current.positionsBadgeCount).toBe(0);
    expect(result.current.totalUnrealizedPnlAmount).toBe(0);
    expect(result.current.totalUnrealizedPnlPercent).toBeUndefined();
    expect(result.current.showUnrealizedPnl).toBe(false);
  });

  it('combines available balance, open position value, and position-derived P&L for returning users', () => {
    const openPosition = createPosition('open', {
      cashPnl: 999,
      currentValue: 980,
      initialValue: 1000,
    });
    mockUsePredictBalance.mockReturnValue(createQuery<number>({ data: 250 }));
    mockUsePredictPositions.mockImplementation(
      ({ claimable }: { claimable?: boolean }) =>
        createQuery<PredictPosition[]>({
          data: claimable ? [] : [openPosition],
        }),
    );

    const { result } = renderHook(() => usePredictPortfolio());

    expect(result.current.portfolioValue).toBe(1230);
    expect(result.current.totalUnrealizedPnlAmount).toBe(-20);
    expect(result.current.totalUnrealizedPnlPercent).toBe(-2);
    expect(result.current.showPnlLine).toBe(true);
    expect(result.current.showUnrealizedPnl).toBe(true);
    expect(result.current.openPositionCount).toBe(1);
    expect(result.current.claimablePositionCount).toBe(0);
    expect(result.current.positionsBadgeCount).toBe(1);
  });

  it('loads account state for positions-only portfolios', () => {
    const openPosition = createPosition('open', {
      currentValue: 50,
    });
    mockUsePredictPositions.mockImplementation(
      ({ claimable }: { claimable?: boolean }) =>
        createQuery<PredictPosition[]>({
          data: claimable ? [] : [openPosition],
        }),
    );

    renderHook(() => usePredictPortfolio());

    expect(mockUsePredictAccountState).toHaveBeenCalledWith({
      enabled: true,
    });
  });

  it('counts only actionable won claimable positions in value, claim amount, and badge', () => {
    const openPosition = createPosition('open', { currentValue: 100 });
    const wonClaimablePosition = createPosition('won', {
      claimable: true,
      currentValue: 46.35,
      status: PredictPositionStatus.WON,
    });
    const lostClaimablePosition = createPosition('lost', {
      claimable: true,
      currentValue: 10,
      status: PredictPositionStatus.LOST,
    });

    mockUsePredictPositions.mockImplementation(
      ({ claimable }: { claimable?: boolean }) =>
        createQuery<PredictPosition[]>({
          data: claimable
            ? [wonClaimablePosition, lostClaimablePosition]
            : [openPosition],
        }),
    );

    const { result } = renderHook(() => usePredictPortfolio());

    expect(result.current.claimableAmount).toBe(46.35);
    expect(result.current.hasClaimableWinnings).toBe(true);
    expect(result.current.portfolioValue).toBe(146.35);
    expect(result.current.openPositionCount).toBe(1);
    expect(result.current.claimablePositionCount).toBe(1);
    expect(result.current.positionsBadgeCount).toBe(2);
  });

  it('loads account state for claimable-only portfolios', () => {
    const wonClaimablePosition = createPosition('won', {
      claimable: true,
      currentValue: 46.35,
      status: PredictPositionStatus.WON,
    });
    mockUsePredictPositions.mockImplementation(
      ({ claimable }: { claimable?: boolean }) =>
        createQuery<PredictPosition[]>({
          data: claimable ? [wonClaimablePosition] : [],
        }),
    );

    renderHook(() => usePredictPortfolio());

    expect(mockUsePredictAccountState).toHaveBeenCalledWith({
      enabled: true,
    });
  });

  it('hides the secondary P&L line below the one-cent threshold', () => {
    mockUsePredictPositions.mockImplementation(
      ({ claimable }: { claimable?: boolean }) =>
        createQuery<PredictPosition[]>({
          data: claimable
            ? []
            : [
                createPosition('open', {
                  cashPnl: 999,
                  currentValue: 100.009,
                  initialValue: 100,
                }),
              ],
        }),
    );

    const { result } = renderHook(() => usePredictPortfolio());

    expect(result.current.totalUnrealizedPnlAmount).toBeCloseTo(0.009);
    expect(result.current.showPnlLine).toBe(false);
    expect(result.current.showUnrealizedPnl).toBe(false);
  });

  it('derives gains from current value minus initial value', () => {
    mockUsePredictPositions.mockImplementation(
      ({ claimable }: { claimable?: boolean }) =>
        createQuery<PredictPosition[]>({
          data: claimable
            ? []
            : [
                createPosition('open', {
                  cashPnl: 999,
                  currentValue: 125,
                  initialValue: 100,
                }),
              ],
        }),
    );

    const { result } = renderHook(() => usePredictPortfolio());

    expect(result.current.totalUnrealizedPnlAmount).toBe(25);
    expect(result.current.totalUnrealizedPnlPercent).toBe(25);
  });

  it('omits unrealized P&L percent when open positions have no initial value', () => {
    mockUsePredictPositions.mockImplementation(
      ({ claimable }: { claimable?: boolean }) =>
        createQuery<PredictPosition[]>({
          data: claimable
            ? []
            : [
                createPosition('open', {
                  currentValue: 10,
                  initialValue: 0,
                }),
              ],
        }),
    );

    const { result } = renderHook(() => usePredictPortfolio());

    expect(result.current.totalUnrealizedPnlAmount).toBe(10);
    expect(result.current.totalUnrealizedPnlPercent).toBeUndefined();
    expect(result.current.showUnrealizedPnl).toBe(true);
  });

  it('treats position loading as portfolio loading', () => {
    mockUsePredictPositions.mockImplementation(
      ({ claimable }: { claimable?: boolean }) =>
        createQuery<PredictPosition[]>({
          data: claimable ? [] : undefined,
          isLoading: !claimable,
        }),
    );

    const { result } = renderHook(() => usePredictPortfolio());

    expect(result.current.isLoading).toBe(true);
  });

  it('aggregates loading, error, and refetch state', async () => {
    const balanceRefetch = jest.fn();
    const activeRefetch = jest.fn();
    const claimableRefetch = jest.fn();
    const accountStateRefetch = jest.fn();
    const balanceError = new Error('balance failed');
    const activePositionsError = new Error('active positions failed');
    const claimablePositionsError = new Error('claimable positions failed');
    const accountStateError = new Error('account state failed');

    mockUsePredictBalance.mockReturnValue(
      createQuery<number>({
        error: balanceError,
        isLoading: true,
        isRefetching: true,
        refetch: balanceRefetch,
      }),
    );
    mockUsePredictPositions.mockImplementation(
      ({ claimable }: { claimable?: boolean }) =>
        createQuery<PredictPosition[]>({
          data: [],
          error: claimable ? claimablePositionsError : activePositionsError,
          refetch: claimable ? claimableRefetch : activeRefetch,
        }),
    );
    mockUsePredictAccountState.mockReturnValue(
      createQuery({ error: accountStateError, refetch: accountStateRefetch }),
    );

    const { result } = renderHook(() => usePredictPortfolio());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRefreshing).toBe(true);
    expect(result.current.error).toBe(balanceError);
    expect(result.current.balanceError).toBe(balanceError);
    expect(result.current.openPositionsError).toBe(activePositionsError);
    expect(result.current.claimablePositionsError).toBe(
      claimablePositionsError,
    );
    expect(result.current.accountStateError).toBe(accountStateError);

    await result.current.refetch();

    expect(balanceRefetch).toHaveBeenCalled();
    expect(activeRefetch).toHaveBeenCalled();
    expect(claimableRefetch).toHaveBeenCalled();
    expect(accountStateRefetch).toHaveBeenCalled();
  });

  it('keeps account state errors out of the portfolio-level error', () => {
    const accountStateError = new Error('account state failed');
    mockUsePredictAccountState.mockReturnValue(
      createQuery({ error: accountStateError }),
    );

    const { result } = renderHook(() => usePredictPortfolio());

    expect(result.current.error).toBeNull();
    expect(result.current.accountStateError).toBe(accountStateError);
  });
});
