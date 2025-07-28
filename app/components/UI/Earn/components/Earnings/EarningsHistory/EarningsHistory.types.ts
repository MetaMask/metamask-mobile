import { TokenI } from '../../../../Tokens/types';
import { EarningsHistoryChartData } from './EarningsHistoryChart/EarningsHistoryChart.types';
import { EarningsHistoryListData } from './EarningsHistoryList/EarningsHistoryList.types';

export interface EarningsHistoryProps {
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
    earnings: EarningsHistoryChartData[];
    earningsTotal: string;
    ticker: string;
  };
  earningsHistoryListData: EarningsHistoryListData[];
}
