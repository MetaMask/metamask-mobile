import { BN } from 'ethereumjs-util';
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import BigNumber from 'bignumber.js';
import {
  fromTokenMinimalUnit,
  fromWei,
  renderFromTokenMinimalUnit,
  renderFromWei,
} from '../../../../../../util/number';
import { TokenI } from '../../../../Tokens/types';
import useStakingEarningsHistory, {
  EarningHistory,
} from '../../../hooks/useStakingEarningsHistory';
import {
  StakingEarningsHistoryChart,
  StakingEarningsHistoryChartData,
} from './StakingEarningsHistoryChart/StakingEarningsHistoryChart';

import TimePeriodButtonGroup, {
  DateRange,
} from './StakingEarningsTimePeriod/StakingEarningsTimePeriod';
import StakingEarningsHistoryList, {
  StakingEarningsHistoryListData,
} from './StakingEarningsHistoryList/StakingEarningsHistoryList';
import { ChainId } from '@metamask/controller-utils';

interface StakingEarningsHistoryProps {
  asset: TokenI;
}

interface TimePeriodGroupInfo {
  dateStr: string;
  chartGroup: string;
  chartGroupLabel: string;
  listGroup: string;
  listGroupLabel: string;
  listGroupHeader: string;
}

interface EarningsHistoryData {
  earningsHistoryChartData: {
    earnings: StakingEarningsHistoryChartData[];
    earningsTotal: string;
    ticker: string;
  };
  earningsHistoryListData: StakingEarningsHistoryListData[];
}

const EARNINGS_HISTORY_TIME_PERIOD_DEFAULT = DateRange.MONTHLY;
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
    listGroupHeader: '',
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
  switch (selectedTimePeriod) {
    case DateRange.DAILY:
      timePeriodInfo.chartGroup = dateStr;
      timePeriodInfo.chartGroupLabel = dayLabel;
      timePeriodInfo.listGroup = dateStr;
      timePeriodInfo.listGroupLabel = dayLabel;
      break;
    case DateRange.MONTHLY:
      timePeriodInfo.chartGroup = `${newYear}-${newMonth}`;
      timePeriodInfo.chartGroupLabel = monthLabel;
      timePeriodInfo.listGroup = `${newYear}-${newMonth}`;
      timePeriodInfo.listGroupLabel = monthLabel;
      timePeriodInfo.listGroupHeader = newYear;
      break;
    case DateRange.YEARLY:
      timePeriodInfo.chartGroup = newYear;
      timePeriodInfo.chartGroupLabel = yearLabel;
      timePeriodInfo.listGroup = newYear;
      timePeriodInfo.listGroupLabel = yearLabel;
      break;
    default:
      throw new Error('Unsupported time period');
  }
  return timePeriodInfo;
};

const StakingEarningsHistory = ({ asset }: StakingEarningsHistoryProps) => {
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<DateRange>(
    EARNINGS_HISTORY_TIME_PERIOD_DEFAULT,
  );
  const {
    earningsHistory,
    isLoading: isLoadingEarningsHistory,
    error: errorEarningsHistory,
  } = useStakingEarningsHistory({
    chainId: asset.chainId as ChainId,
    limitDays: EARNINGS_HISTORY_DAYS_LIMIT,
  });

  const ticker = asset.ticker ?? asset.symbol;

  const formatRewardsWei = useCallback(
    (rewards: number | string | BN, isRemoveSpecialCharacters?: boolean) => {
      if (!isRemoveSpecialCharacters) {
        // return a string with possible special characters in display formatting
        return asset.isETH
          ? renderFromWei(rewards)
          : renderFromTokenMinimalUnit(rewards, asset.decimals);
      }
      // return a string without special characters
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
    const historyData: EarningsHistoryData = {
      earningsHistoryChartData: {
        earnings: [],
        earningsTotal: '0',
        ticker,
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
    let trailingZeroHistoryListValues = 0;
    let rewardsUsdTotalForListTimePeriod = 0;
    let currentTimePeriodChartGroup: string | null = null;
    let currentTimePeriodListGroup: string | null = null;
    let lastEntryTimePeriodGroupInfo: TimePeriodGroupInfo = {
      dateStr: '',
      chartGroup: '',
      chartGroupLabel: '',
      listGroup: '',
      listGroupLabel: '',
      listGroupHeader: '',
    };
    let prevLastEntryTimePeriodGroupInfo: TimePeriodGroupInfo = {
      dateStr: '',
      chartGroup: '',
      chartGroupLabel: '',
      listGroup: '',
      listGroupLabel: '',
      listGroupHeader: '',
    };

    // update earnings total from last sumRewards key
    const updateEarningsTotal = (entry: EarningHistory) => {
      historyData.earningsHistoryChartData.earningsTotal = formatRewardsWei(
        entry.sumRewards,
      );
    };

    // handles chart specific data per entry
    const handleChartData = (entry: EarningHistory) => {
      const rewardsBN = new BN(entry.dailyRewards);
      const { chartGroup: newChartGroup } = lastEntryTimePeriodGroupInfo;
      // add rewards to total for time period
      if (currentTimePeriodChartGroup === newChartGroup) {
        rewardsTotalForChartTimePeriodBN =
          rewardsTotalForChartTimePeriodBN.add(rewardsBN);
      } else {
        historyData.earningsHistoryChartData.earnings.unshift({
          value: parseFloat(
            formatRewardsWei(rewardsTotalForChartTimePeriodBN.toString(), true),
          ),
          label: prevLastEntryTimePeriodGroupInfo.chartGroupLabel,
        });
        // update current time period group
        currentTimePeriodChartGroup = newChartGroup;
        // reset for next time period
        rewardsTotalForChartTimePeriodBN = new BN(rewardsBN);
      }
    };

    // handles list specific data per entry
    const handleListData = (entry: EarningHistory) => {
      const rewardsBN = new BN(entry.dailyRewards);
      const { listGroup: newListGroup } = lastEntryTimePeriodGroupInfo;
      if (currentTimePeriodListGroup === newListGroup) {
        rewardsTotalForListTimePeriodBN =
          rewardsTotalForListTimePeriodBN.add(rewardsBN);
        rewardsUsdTotalForListTimePeriod += parseFloat(entry.dailyRewardsUsd);
      } else {
        if (!rewardsTotalForListTimePeriodBN.gt(new BN(0))) {
          trailingZeroHistoryListValues++;
        } else {
          trailingZeroHistoryListValues = 0;
        }
        historyData.earningsHistoryListData.push({
          label: prevLastEntryTimePeriodGroupInfo.listGroupLabel,
          groupLabel: prevLastEntryTimePeriodGroupInfo.chartGroupLabel,
          groupHeader: prevLastEntryTimePeriodGroupInfo.listGroupHeader,
          amount: formatRewardsWei(rewardsTotalForListTimePeriodBN),
          amountUsd: String(rewardsUsdTotalForListTimePeriod.toFixed(2)),
        });

        currentTimePeriodListGroup = newListGroup;
        // reset for next time period
        rewardsTotalForListTimePeriodBN = new BN(rewardsBN);
        rewardsUsdTotalForListTimePeriod = parseFloat(entry.dailyRewardsUsd);
      }
    };

    const handleListTrailingZeros = () => {
      if (trailingZeroHistoryListValues > 0) {
        historyData.earningsHistoryListData.splice(
          historyData.earningsHistoryListData.length -
            trailingZeroHistoryListValues,
          trailingZeroHistoryListValues,
        );
      }
    };

    const finalizeListData = () => {
      if (historyData.earningsHistoryChartData.earnings.length < barLimit) {
        if (!rewardsTotalForListTimePeriodBN.gt(new BN(0))) {
          trailingZeroHistoryListValues++;
        } else {
          trailingZeroHistoryListValues = 0;
        }
        historyData.earningsHistoryListData.push({
          label: lastEntryTimePeriodGroupInfo.listGroupLabel,
          groupLabel: lastEntryTimePeriodGroupInfo.chartGroupLabel,
          groupHeader: lastEntryTimePeriodGroupInfo.listGroupHeader,
          amount: formatRewardsWei(rewardsTotalForListTimePeriodBN),
          amountUsd: String(rewardsUsdTotalForListTimePeriod.toFixed(2)),
        });
      }
      // removes trailing zeros from history list
      handleListTrailingZeros();
    };

    const finalizeChartData = () => {
      if (historyData.earningsHistoryChartData.earnings.length < barLimit) {
        historyData.earningsHistoryChartData.earnings.unshift({
          value: parseFloat(
            formatRewardsWei(rewardsTotalForChartTimePeriodBN.toString(), true),
          ),
          label: lastEntryTimePeriodGroupInfo.chartGroupLabel,
        });
      }
    };

    const finalizeProcessing = () => {
      finalizeListData();
      finalizeChartData();
    };

    const processEntry = (entry: EarningHistory, i: number) => {
      if (i === transformedEarningsHistory.length - 1) {
        updateEarningsTotal(entry);
      }
      prevLastEntryTimePeriodGroupInfo = {
        ...lastEntryTimePeriodGroupInfo,
      };
      lastEntryTimePeriodGroupInfo = getEntryTimePeriodGroupInfo(
        entry.dateStr,
        selectedTimePeriod,
      );
      if (!currentTimePeriodChartGroup) {
        currentTimePeriodChartGroup = lastEntryTimePeriodGroupInfo.chartGroup;
        currentTimePeriodListGroup = lastEntryTimePeriodGroupInfo.listGroup;
      }
      if (historyData.earningsHistoryChartData.earnings.length < barLimit) {
        handleChartData(entry);
        handleListData(entry);
      }
    };

    const processEntries = () => {
      for (let i = transformedEarningsHistory.length - 1; i >= 0; i--) {
        processEntry(transformedEarningsHistory[i], i);
      }
      finalizeProcessing();
    };

    processEntries();

    return historyData;
  }, [
    selectedTimePeriod,
    isLoadingEarningsHistory,
    errorEarningsHistory,
    transformedEarningsHistory,
    ticker,
    formatRewardsWei,
  ]);

  const onTimePeriodChange = (newTimePeriod: DateRange) => {
    setSelectedTimePeriod(newTimePeriod);
  };

  return isLoadingEarningsHistory ? null : (
    <View>
      <TimePeriodButtonGroup
        initialTimePeriod={selectedTimePeriod}
        onTimePeriodChange={onTimePeriodChange}
      />
      <StakingEarningsHistoryChart
        ticker={ticker}
        earningsTotal={earningsHistoryChartData.earningsTotal}
        earnings={earningsHistoryChartData.earnings}
        formatValue={(value) => formatRewardsNumber(value)}
      />
      <StakingEarningsHistoryList
        earnings={earningsHistoryListData}
        ticker={ticker}
      />
    </View>
  );
};

export default StakingEarningsHistory;
