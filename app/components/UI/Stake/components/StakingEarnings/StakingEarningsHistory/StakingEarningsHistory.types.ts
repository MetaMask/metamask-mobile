import { TokenI } from '../../../../Tokens/types';
import { StakingEarningsHistoryChartData } from './StakingEarningsHistoryChart/StakingEarningsHistoryChart.types';
import { StakingEarningsHistoryListData } from './StakingEarningsHistoryList/StakingEarningsHistoryList.types';

export interface StakingEarningsHistoryProps {
  asset: TokenI;
}

export interface TimePeriodGroupInfo {
  dateStr: string;
  chartGroup: string;
  chartGroupLabel: string;
  listGroup: string;
  listGroupLabel: string;
  listGroupHeader: string;
}

export interface EarningsHistoryData {
  earningsHistoryChartData: {
    earnings: StakingEarningsHistoryChartData[];
    earningsTotal: string;
    ticker: string;
  };
  earningsHistoryListData: StakingEarningsHistoryListData[];
}
