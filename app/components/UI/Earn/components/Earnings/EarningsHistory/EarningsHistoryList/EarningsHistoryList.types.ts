import { EARN_EXPERIENCES } from '../../../../constants/experiences';

export interface EarningsHistoryListProps {
  earnings: EarningsHistoryListData[];
  filterByGroupLabel?: string;
  type: EARN_EXPERIENCES;
}

export interface EarningsHistoryListData {
  label: string;
  amount: string;
  amountSecondaryText: string;
  groupLabel: string;
  groupHeader: string;
  ticker: string;
}
