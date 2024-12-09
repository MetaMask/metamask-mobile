import { BN } from 'ethereumjs-util';
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  fromTokenMinimalUnit,
  fromWei,
  renderFromTokenMinimalUnit,
  renderFromWei,
} from '../../../../../../util/number';
import { TokenI } from '../../../../Tokens/types';
import useStakingEarningsHistory from '../../../hooks/useStakingEarningsHistory';
import StakingEarningsHistoryChart, {
  StakingEarningsHistoryChartData,
} from './StakingEarningsHistoryChart/StakingEarningsHistoryChart';
import StakingEarningsHistoryList, {
  StakingEarningsHistoryListData,
} from './StakingEarningsHistoryList/StakingEarningHistoryList';
import TimePeriodButtonGroup, {
  DateRange,
} from './StakingEarningsTimePeriod/StakingEarningsTimePeriod';
import BigNumber from 'bignumber.js';
// import { getUTCWeekRange } from '../../../utils/date';

interface StakingEarningsHistoryProps {
  asset: TokenI;
}

interface TimePeriodGroupInfo {
  dateStr: string;
  chartGroup: string;
  chartGroupLabel: string;
  listGroup: string;
  listGroupLabel: string;
}

const EARNINGS_HISTORY_TIME_PERIOD_DEFAULT = DateRange.DAILY;
const EARNINGS_HISTORY_DAYS_LIMIT = 730;
const EARNINGS_HISTORY_CHART_BAR_LIMIT = {
  [DateRange.DAILY]: 7,
  [DateRange.MONTHLY]: 12,
  [DateRange.YEARLY]: 2,
};

const getEntryTimePeriodGroupInfo = (
  dateStr: string,
  selectedTimePeriod: DateRange,
) => {
  const [newYear, newMonth] = dateStr.split('-');
  const date = new Date(dateStr);
  date.setUTCHours(0, 0, 0, 0);
  const timePeriodInfo: TimePeriodGroupInfo = {
    dateStr,
    chartGroup: '',
    chartGroupLabel: '',
    listGroup: '',
    listGroupLabel: '',
  };
  const dayLabel = date.toLocaleString('fullwide', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const monthLabel = date.toLocaleString('fullwide', {
    month: 'long',
    timeZone: 'UTC',
  });
  const yearLabel = date.toLocaleString('fullwide', {
    year: 'numeric',
    timeZone: 'UTC',
  });
  // const utcDateRange = getUTCWeekRange(dateStr);
  // const dateRangeStartLabel = new Date(utcDateRange.start).toLocaleString(
  //   'fullwide',
  //   {
  //     month: 'long',
  //     day: 'numeric',
  //     timeZone: 'UTC',
  //   },
  // );
  // const dateRangeEndLabel = new Date(utcDateRange.end).toLocaleString(
  //   'fullwide',
  //   {
  //     month: 'long',
  //     day: 'numeric',
  //     timeZone: 'UTC',
  //   },
  // );
  switch (selectedTimePeriod) {
    case DateRange.DAILY:
      timePeriodInfo.chartGroup = dateStr;
      timePeriodInfo.chartGroupLabel = dayLabel;
      timePeriodInfo.listGroup = dateStr;
      timePeriodInfo.listGroupLabel = dayLabel;
      break;
    // case DateRange.WEEKLY:
    //   timePeriodInfo.chartGroup = `${utcDateRange.start}|${utcDateRange.end}`;
    //   timePeriodInfo.chartGroupLabel = `${dateRangeStartLabel} - ${dateRangeEndLabel}`;
    //   timePeriodInfo.listGroup = dateStr;
    //   timePeriodInfo.listGroupLabel = dayLabel;
    //   break;
    case DateRange.MONTHLY:
      timePeriodInfo.chartGroup = `${newYear}-${newMonth}`;
      timePeriodInfo.chartGroupLabel = monthLabel;
      timePeriodInfo.listGroup = `${newYear}-${newMonth}`;
      timePeriodInfo.listGroupLabel = monthLabel;
      break;
    case DateRange.YEARLY:
      timePeriodInfo.chartGroup = newYear;
      timePeriodInfo.chartGroupLabel = yearLabel;
      timePeriodInfo.listGroup = newYear;
      timePeriodInfo.listGroupLabel = yearLabel;
      break;
    default:
      break;
  }
  return timePeriodInfo;
};

const StakingEarningsHistory = ({ asset }: StakingEarningsHistoryProps) => {
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<DateRange>(
    EARNINGS_HISTORY_TIME_PERIOD_DEFAULT,
  );
  // const [earningsHistoryFilter, setEarningsHistoryFilter] = useState('');

  const {
    earningsHistory,
    isLoading: isLoadingEarningsHistory,
    error: errorEarningsHistory,
  } = useStakingEarningsHistory({ limitDays: EARNINGS_HISTORY_DAYS_LIMIT });

  const formatRewardsWei = useCallback(
    (rewards: number | string | BN, raw?: boolean) => {
      if (!raw) {
        return asset.isETH
          ? renderFromWei(rewards)
          : renderFromTokenMinimalUnit(rewards, asset.decimals);
      }
      return asset.isETH
        ? fromWei(rewards)
        : fromTokenMinimalUnit(rewards, asset.decimals);
    },
    [asset.isETH, asset.decimals],
  );

  const formatRewardsNumber = useCallback(
    (rewards: number) => {
      const num = new BN(
        new BigNumber(rewards)
          .multipliedBy(new BigNumber(10).pow(asset.decimals || 18))
          .toString(),
      );
      return formatRewardsWei(num);
    },
    [asset.decimals, formatRewardsWei],
  );

  const transformedEarningsHistory = useMemo(() => {
    if (!earningsHistory?.length) return [];
    const gapFilledEarningsHistory = [...earningsHistory];
    const earliestDate = new Date(earningsHistory[0].dateStr);
    const daysToFill = EARNINGS_HISTORY_DAYS_LIMIT - earningsHistory.length;
    const gapDate = new Date(earliestDate);
    gapDate.setUTCHours(0, 0, 0, 0);
    for (let i = 0; i < daysToFill; i++) {
      gapDate.setDate(gapDate.getDate() - 1);
      gapFilledEarningsHistory.unshift({
        dateStr: gapDate.toISOString().split('T')[0],
        dailyRewards: '0',
        dailyRewardsUsd: '0',
        sumRewards: '0',
      });
    }
    return gapFilledEarningsHistory;
  }, [earningsHistory]);

  const { earningsHistoryChartData, earningsHistoryListData } = useMemo(() => {
    const historyData: {
      earningsHistoryChartData: {
        earnings: StakingEarningsHistoryChartData[];
        earningsTotal: string;
        symbol: string;
      };
      earningsHistoryListData: StakingEarningsHistoryListData[];
    } = {
      earningsHistoryChartData: {
        earnings: [],
        earningsTotal: '0',
        symbol: asset.symbol,
      },
      earningsHistoryListData: [],
    };

    if (
      isLoadingEarningsHistory ||
      errorEarningsHistory ||
      !transformedEarningsHistory ||
      transformedEarningsHistory.length === 0
    )
      return historyData;

    const barLimit = EARNINGS_HISTORY_CHART_BAR_LIMIT[selectedTimePeriod];
    let rewardsTotalForChartTimePeriodBN = new BN(0);
    let rewardsTotalForListTimePeriodBN = new BN(0);
    let rewardsUsdTotalForListTimePeriod = 0;
    let currentTimePeriodChartGroup: string | null = null;
    let currentTimePeriodListGroup: string | null = null;
    let lastEntryTimePeriodGroupInfo: TimePeriodGroupInfo = {
      dateStr: '',
      chartGroup: '',
      chartGroupLabel: '',
      listGroup: '',
      listGroupLabel: '',
    };

    for (let i = transformedEarningsHistory.length - 1; i >= 0; i--) {
      const entry = transformedEarningsHistory[i];
      if (i === transformedEarningsHistory.length - 1) {
        historyData.earningsHistoryChartData.earningsTotal = formatRewardsWei(
          entry.sumRewards,
        );
      }
      const rewardsBN = new BN(entry.dailyRewards);
      const prevLastEntryTimePeriodGroupInfo = {
        ...lastEntryTimePeriodGroupInfo,
      };
      lastEntryTimePeriodGroupInfo = getEntryTimePeriodGroupInfo(
        entry.dateStr,
        selectedTimePeriod,
      );
      const { chartGroup: newChartGroup, listGroup: newListGroup } =
        lastEntryTimePeriodGroupInfo;
      if (historyData.earningsHistoryChartData.earnings.length < barLimit) {
        // if no current time period group, set it
        if (!currentTimePeriodChartGroup) {
          currentTimePeriodChartGroup = newChartGroup;
          currentTimePeriodListGroup = newListGroup;
        }
        // add rewards to total for time period
        if (currentTimePeriodChartGroup === newChartGroup) {
          rewardsTotalForChartTimePeriodBN =
            rewardsTotalForChartTimePeriodBN.add(rewardsBN);
        } else {
          historyData.earningsHistoryChartData.earnings.unshift({
            value: parseFloat(
              formatRewardsWei(
                rewardsTotalForChartTimePeriodBN.toString(),
                true,
              ),
            ),
            label: prevLastEntryTimePeriodGroupInfo.chartGroupLabel,
          });
          // update current time period group
          currentTimePeriodChartGroup = newChartGroup;
          // reset for next time period
          rewardsTotalForChartTimePeriodBN = new BN(rewardsBN);
        }
        // deal with history list data
        if (currentTimePeriodListGroup === newListGroup) {
          rewardsTotalForListTimePeriodBN =
            rewardsTotalForListTimePeriodBN.add(rewardsBN);
          rewardsUsdTotalForListTimePeriod += parseFloat(entry.dailyRewardsUsd);
        } else {
          if (rewardsTotalForListTimePeriodBN.gt(new BN(0))) {
            historyData.earningsHistoryListData.push({
              label: prevLastEntryTimePeriodGroupInfo.listGroupLabel,
              groupLabel: prevLastEntryTimePeriodGroupInfo.chartGroupLabel,
              amount: formatRewardsWei(rewardsTotalForListTimePeriodBN),
              amountUsd: String(rewardsUsdTotalForListTimePeriod.toFixed(2)),
            });
          }
          currentTimePeriodListGroup = newListGroup;
          // reset for next time period
          rewardsTotalForListTimePeriodBN = new BN(rewardsBN);
          rewardsUsdTotalForListTimePeriod = parseFloat(entry.dailyRewardsUsd);
        }
      }
    }
    if (historyData.earningsHistoryChartData.earnings.length < barLimit) {
      historyData.earningsHistoryChartData.earnings.unshift({
        value: parseFloat(
          formatRewardsWei(rewardsTotalForChartTimePeriodBN.toString(), true),
        ),
        label: lastEntryTimePeriodGroupInfo.chartGroupLabel,
      });
      if (rewardsTotalForListTimePeriodBN.gt(new BN(0))) {
        historyData.earningsHistoryListData.push({
          label: lastEntryTimePeriodGroupInfo.listGroupLabel,
          groupLabel: lastEntryTimePeriodGroupInfo.chartGroupLabel,
          amount: formatRewardsWei(rewardsTotalForListTimePeriodBN),
          amountUsd: String(rewardsUsdTotalForListTimePeriod.toFixed(2)),
        });
      }
    }

    return historyData;
  }, [
    selectedTimePeriod,
    isLoadingEarningsHistory,
    errorEarningsHistory,
    transformedEarningsHistory,
    asset.symbol,
    formatRewardsWei,
  ]);

  const onTimePeriodChange = (newTimePeriod: DateRange) => {
    setSelectedTimePeriod(newTimePeriod);
  };

  const onSelectedEarning = (earning?: { value: number; label: string }) => {
    if (!earning) {
      // setEarningsHistoryFilter('');
    } else {
      // setEarningsHistoryFilter(earning.label);
    }
  };

  return (
    <View>
      <TimePeriodButtonGroup
        initialTimePeriod={selectedTimePeriod}
        onTimePeriodChange={onTimePeriodChange}
      />
      <StakingEarningsHistoryChart
        symbol={asset.symbol}
        earningsTotal={earningsHistoryChartData.earningsTotal}
        earnings={earningsHistoryChartData.earnings}
        formatValue={(value) => formatRewardsNumber(value)}
        onSelectedEarning={onSelectedEarning}
      />
      <StakingEarningsHistoryList
        earnings={earningsHistoryListData}
        symbol={asset.symbol}
        // filterByGroupLabel={earningsHistoryFilter}
      />
    </View>
  );
};

export default StakingEarningsHistory;
