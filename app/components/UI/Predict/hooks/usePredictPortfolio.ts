import { useCallback, useMemo } from 'react';
import {
  PredictPositionStatus,
  type AccountState,
  type PredictPosition,
} from '../types';
import { usePredictAccountState } from './usePredictAccountState';
import { usePredictBalance } from './usePredictBalance';
import { usePredictClaim } from './usePredictClaim';
import { usePredictDeposit } from './usePredictDeposit';
import { usePredictPositions } from './usePredictPositions';
import { usePredictWithdraw } from './usePredictWithdraw';

const PNL_DISPLAY_THRESHOLD = 0.01;
const EMPTY_POSITIONS: PredictPosition[] = [];

const sumCurrentValue = (positions: PredictPosition[]) =>
  positions.reduce((sum, position) => sum + position.currentValue, 0);

export interface PredictPortfolioModel {
  activePositions: PredictPosition[];
  actionableClaimablePositions: PredictPosition[];
  accountStateError: Error | null;
  availableBalance: number;
  balanceError: Error | null;
  claim: ReturnType<typeof usePredictClaim>['claim'];
  claimableAmount: number;
  claimablePositionCount: number;
  claimablePositions: PredictPosition[];
  claimablePositionsError: Error | null;
  deposit: ReturnType<typeof usePredictDeposit>['deposit'];
  error: Error | null;
  hasClaimableWinnings: boolean;
  isBalanceLoading: boolean;
  isClaimPending: boolean;
  isDepositPending: boolean;
  isLoading: boolean;
  isPositionsLoading: boolean;
  isRefreshing: boolean;
  openPositionCount: number;
  openPositions: PredictPosition[];
  openPositionsError: Error | null;
  openPositionsValue: number;
  portfolioValue: number;
  positionsBadgeCount: number;
  refetch: () => Promise<void>;
  showPnlLine: boolean;
  showUnrealizedPnl: boolean;
  totalUnrealizedPnlAmount: number;
  totalUnrealizedPnlPercent?: number;
  walletType?: AccountState['walletType'];
  withdraw: ReturnType<typeof usePredictWithdraw>['withdraw'];
  withdrawTransaction: ReturnType<
    typeof usePredictWithdraw
  >['withdrawTransaction'];
}

const getPositionsPnl = (positions: PredictPosition[]) => {
  const totals = positions.reduce(
    (acc, position) => ({
      currentValue: acc.currentValue + position.currentValue,
      initialValue: acc.initialValue + position.initialValue,
    }),
    { currentValue: 0, initialValue: 0 },
  );
  const amount = totals.currentValue - totals.initialValue;

  return {
    amount,
    percent:
      totals.initialValue > 0
        ? (amount / totals.initialValue) * 100
        : undefined,
  };
};

export function usePredictPortfolio(): PredictPortfolioModel {
  const {
    data: availableBalance = 0,
    isLoading: isBalanceLoading,
    isRefetching: isBalanceRefetching,
    error: balanceError,
    refetch: refetchBalance,
  } = usePredictBalance();

  const activePositionsQuery = usePredictPositions({
    claimable: false,
    livePriceUpdates: true,
  });
  const claimablePositionsQuery = usePredictPositions({ claimable: true });

  const activePositions = activePositionsQuery.data ?? EMPTY_POSITIONS;
  const claimablePositions = claimablePositionsQuery.data ?? EMPTY_POSITIONS;
  const refetchActivePositions = activePositionsQuery.refetch;
  const refetchClaimablePositions = claimablePositionsQuery.refetch;
  const openPositions = useMemo(
    () =>
      activePositions.filter(
        (position) => position.status === PredictPositionStatus.OPEN,
      ),
    [activePositions],
  );
  const actionableClaimablePositions = useMemo(
    () =>
      claimablePositions.filter(
        (position) =>
          position.status === PredictPositionStatus.WON &&
          position.currentValue > 0,
      ),
    [claimablePositions],
  );

  const hasOpenPositions = openPositions.length > 0;
  const { claim, isClaimPending } = usePredictClaim();
  const { deposit, isDepositPending } = usePredictDeposit();
  const { withdraw, withdrawTransaction } = usePredictWithdraw();

  const accountStateQuery = usePredictAccountState({
    enabled: availableBalance > 0,
  });
  const refetchAccountState = accountStateQuery.refetch;

  const openPositionsValue = useMemo(
    () => sumCurrentValue(openPositions),
    [openPositions],
  );
  const claimableAmount = useMemo(
    () => sumCurrentValue(actionableClaimablePositions),
    [actionableClaimablePositions],
  );
  const totalUnrealizedPnl = useMemo(
    () => getPositionsPnl(openPositions),
    [openPositions],
  );

  const totalUnrealizedPnlAmount = hasOpenPositions
    ? totalUnrealizedPnl.amount
    : 0;
  const totalUnrealizedPnlPercent = hasOpenPositions
    ? totalUnrealizedPnl.percent
    : undefined;
  const portfolioValue =
    availableBalance + openPositionsValue + claimableAmount;
  const openPositionCount = openPositions.length;
  const claimablePositionCount = actionableClaimablePositions.length;
  const positionsBadgeCount = openPositionCount + claimablePositionCount;
  const isPositionsLoading =
    activePositionsQuery.isLoading || claimablePositionsQuery.isLoading;
  const showUnrealizedPnl =
    Math.abs(totalUnrealizedPnlAmount) >= PNL_DISPLAY_THRESHOLD;

  const refetch = useCallback(async () => {
    await Promise.all([
      refetchBalance(),
      refetchActivePositions(),
      refetchClaimablePositions(),
      refetchAccountState(),
    ]);
  }, [
    refetchBalance,
    refetchActivePositions,
    refetchClaimablePositions,
    refetchAccountState,
  ]);

  return {
    activePositions,
    actionableClaimablePositions,
    accountStateError: accountStateQuery.error ?? null,
    availableBalance,
    balanceError,
    claim,
    claimableAmount,
    claimablePositionCount,
    claimablePositions,
    claimablePositionsError: claimablePositionsQuery.error ?? null,
    deposit,
    error:
      balanceError ??
      activePositionsQuery.error ??
      claimablePositionsQuery.error ??
      accountStateQuery.error ??
      null,
    hasClaimableWinnings: claimableAmount > 0,
    isBalanceLoading,
    isClaimPending,
    isDepositPending,
    isLoading: isBalanceLoading || isPositionsLoading,
    isPositionsLoading,
    isRefreshing:
      isBalanceRefetching ||
      activePositionsQuery.isRefetching ||
      claimablePositionsQuery.isRefetching ||
      accountStateQuery.isRefetching,
    openPositionCount,
    openPositions,
    openPositionsError: activePositionsQuery.error ?? null,
    openPositionsValue,
    portfolioValue,
    positionsBadgeCount,
    refetch,
    showPnlLine: showUnrealizedPnl,
    showUnrealizedPnl,
    totalUnrealizedPnlAmount,
    totalUnrealizedPnlPercent,
    walletType: accountStateQuery.data?.walletType,
    withdraw,
    withdrawTransaction,
  };
}
