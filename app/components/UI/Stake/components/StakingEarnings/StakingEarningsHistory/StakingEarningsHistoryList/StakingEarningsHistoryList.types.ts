export interface StakingEarningsHistoryListProps {
  earnings: StakingEarningsHistoryListData[];
  filterByGroupLabel?: string;
}

export interface StakingEarningsHistoryListData {
  label: string;
  amount: string;
  amountSecondaryText: string;
  groupLabel: string;
  groupHeader: string;
  ticker: string;
}
