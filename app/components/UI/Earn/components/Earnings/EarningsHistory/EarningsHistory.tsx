import { Hex } from '@metamask/utils';
import { BN } from 'ethereumjs-util';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../reducers';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../../selectors/currencyRateController';
import { earnSelectors } from '../../../../../../selectors/earnController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../../selectors/networkController';
import { selectTokenMarketData } from '../../../../../../selectors/tokenRatesController';
import { EARN_EXPERIENCES } from '../../../constants/experiences';
import useEarningsHistory, {
  EarningHistory,
} from '../../../hooks/useEarningsHistory';
import { EarnTokenDetails } from '../../../types/lending.types';
import {
  EARNINGS_HISTORY_CHART_BAR_LIMIT,
  EARNINGS_HISTORY_DAYS_LIMIT,
  EARNINGS_HISTORY_TIME_PERIOD_DEFAULT,
} from './EarningsHistory.constants';
import {
  EarningsHistoryData,
  EarningsHistoryProps,
  TimePeriodGroupInfo,
} from './EarningsHistory.types';
import {
  fillGapsInEarningsHistory,
  formatRewardsFiat,
  formatRewardsNumber,
  formatRewardsWei,
  getEntryTimePeriodGroupInfo,
} from './EarningsHistory.utils';
import { EarningsHistoryChart } from './EarningsHistoryChart/EarningsHistoryChart';
import EarningsHistoryList from './EarningsHistoryList/EarningsHistoryList';
import TimePeriodButtonGroup from './EarningsTimePeriod/EarningsTimePeriod';
import { DateRange } from './EarningsTimePeriod/EarningsTimePeriod.types';

const EarningsHistory = ({ asset }: EarningsHistoryProps) => {
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<DateRange>(
    EARNINGS_HISTORY_TIME_PERIOD_DEFAULT,
  );
  const currentCurrency: string = useSelector(selectCurrentCurrency);
  const multiChainMarketData = useSelector(selectTokenMarketData);
  const multiChainCurrencyRates = useSelector(selectCurrencyRates);
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const { outputToken } = useSelector((state: RootState) =>
    earnSelectors.selectEarnTokenPair(state, asset),
  );
  const {
    earningsHistory,
    isLoading: isLoadingEarningsHistory,
    error: errorEarningsHistory,
  } = useEarningsHistory({
    asset: outputToken as EarnTokenDetails,
    limitDays: EARNINGS_HISTORY_DAYS_LIMIT,
  });

  const ticker = useMemo(
    () => asset.ticker || asset.symbol,
    [asset.ticker, asset.symbol],
  );

  // get exchange rates for asset chainId
  const exchangeRates = multiChainMarketData[asset.chainId as Hex];
  let exchangeRate = 0;
  if (exchangeRates) {
    exchangeRate = exchangeRates[asset.address as Hex]?.price;
  }
  // attempt to find native currency for asset chainId
  const nativeCurrency =
    networkConfigurations[asset.chainId as Hex]?.nativeCurrency;
  let conversionRate = 0;
  // if native currency is found, use it to get conversion rate
  if (nativeCurrency) {
    conversionRate =
      multiChainCurrencyRates[nativeCurrency]?.conversionRate ?? conversionRate;
  }

  const transformedEarningsHistory = useMemo(
    () =>
      fillGapsInEarningsHistory(earningsHistory, EARNINGS_HISTORY_DAYS_LIMIT),
    [earningsHistory],
  );

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
        asset,
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
            formatRewardsWei(
              rewardsTotalForChartTimePeriodBN.toString(),
              asset,
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
    };

    // handles list specific data per entry
    const handleListData = (entry: EarningHistory) => {
      const rewardsBN = new BN(entry.dailyRewards);
      const { listGroup: newListGroup } = lastEntryTimePeriodGroupInfo;
      if (currentTimePeriodListGroup === newListGroup) {
        rewardsTotalForListTimePeriodBN =
          rewardsTotalForListTimePeriodBN.add(rewardsBN);
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
          amount: formatRewardsWei(rewardsTotalForListTimePeriodBN, asset),
          amountSecondaryText: formatRewardsFiat(
            rewardsTotalForListTimePeriodBN,
            asset,
            currentCurrency,
            conversionRate,
            exchangeRate,
          ),
          ticker,
        });

        // reset for next time period
        currentTimePeriodListGroup = newListGroup;
        rewardsTotalForListTimePeriodBN = new BN(rewardsBN);
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
          amount: formatRewardsWei(rewardsTotalForListTimePeriodBN, asset),
          amountSecondaryText: formatRewardsFiat(
            rewardsTotalForListTimePeriodBN,
            asset,
            currentCurrency,
            conversionRate,
            exchangeRate,
          ),
          ticker,
        });
      }
      // removes trailing zeros from history list
      handleListTrailingZeros();
    };

    const finalizeChartData = () => {
      if (historyData.earningsHistoryChartData.earnings.length < barLimit) {
        historyData.earningsHistoryChartData.earnings.unshift({
          value: parseFloat(
            formatRewardsWei(
              rewardsTotalForChartTimePeriodBN.toString(),
              asset,
              true,
            ),
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
    asset,
    ticker,
    currentCurrency,
    conversionRate,
    exchangeRate,
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
      <EarningsHistoryChart
        ticker={ticker}
        earningsTotal={earningsHistoryChartData.earningsTotal}
        earnings={earningsHistoryChartData.earnings}
        formatValue={(value: number) => formatRewardsNumber(value, asset)}
      />
      <EarningsHistoryList
        earnings={earningsHistoryListData}
        type={outputToken?.experience?.type as EARN_EXPERIENCES}
      />
    </View>
  );
};

export default EarningsHistory;
