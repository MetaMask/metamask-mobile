import React, { useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { ScrollView } from 'react-native';
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter';
import { useTheme } from '../../../../../util/theme';

import { useRoute, RouteProp } from '@react-navigation/native';
import { POOLED_STAKING_FAQ_URL } from '../../constants';
import styleSheet from './PoolStakingLearnMoreModal.styles';
import { useStyles } from '../../../../hooks/useStyles';
import useVaultApys from '../../hooks/useVaultApys';
import InteractiveTimespanChart from './InteractiveTimespanChart';
import BigNumber from 'bignumber.js';
import {
  formatChartDate,
  getGraphInsetsByDataPointLength,
} from './InteractiveTimespanChart/InteractiveTimespanChart.utils';
import { strings } from '../../../../../../locales/i18n';
import { parseVaultApyAveragesResponse } from './PoolStakingLearnMoreModal.utils';
import useVaultApyAverages from '../../hooks/useVaultApyAverages';
import {
  CommonPercentageInputUnits,
  formatPercent,
  PercentageOutputFormat,
} from '../../utils/value';
import { Hex } from 'viem/_types/types/misc';
import { getDecimalChainId } from '../../../../../util/networks';
import { endTrace, trace, TraceName } from '../../../../../util/trace';
import { EARN_EXPERIENCES } from '../../../Earn/constants/experiences';
import {
  LearnMoreModalFooter,
  StakingInfoBodyText,
  StakingInfoStrings,
} from '../LearnMoreModal';

interface PoolStakingLearnMoreModalRouteParams {
  chainId: Hex;
}

type PoolStakingLearnMoreModalRouteProp = RouteProp<
  { params: PoolStakingLearnMoreModalRouteParams },
  'params'
>;

const PoolStakingLearnMoreModal = () => {
  const { styles } = useStyles(styleSheet, {});
  const { colors } = useTheme();

  const route = useRoute<PoolStakingLearnMoreModalRouteProp>();
  const { chainId: routeChainId } = route.params;

  const sheetRef = useRef<BottomSheetRef>(null);

  const { vaultApys, isLoadingVaultApys } = useVaultApys(
    getDecimalChainId(routeChainId),
  );

  // Order apys from oldest to newest
  const reversedVaultApys = useMemo(
    () => [...vaultApys].reverse(),
    [vaultApys],
  );

  const { vaultApyAverages, isLoadingVaultApyAverages } = useVaultApyAverages(
    getDecimalChainId(routeChainId),
  );

  // Converts VaultApyAverage for use with interactive graph timespan buttons.
  const parsedVaultTimespanApyAverages = useMemo(() => {
    if (isLoadingVaultApyAverages) return;
    return parseVaultApyAveragesResponse(vaultApyAverages);
  }, [isLoadingVaultApyAverages, vaultApyAverages]);

  const [activeTimespanApyAverage, setActiveTimespanApyAverage] = useState(
    parsedVaultTimespanApyAverages?.[7],
  );

  useEffect(() => {
    if (parsedVaultTimespanApyAverages) {
      setActiveTimespanApyAverage(parsedVaultTimespanApyAverages?.[7]);
    }
  }, [parsedVaultTimespanApyAverages]);

  const handleClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  useEffect(() => {
    trace({
      name: TraceName.EarnFaqApys,
      data: { experience: EARN_EXPERIENCES.POOLED_STAKING },
    });
    endTrace({ name: TraceName.EarnFaq });
  }, []);

  useEffect(() => {
    if (Boolean(reversedVaultApys.length) && activeTimespanApyAverage) {
      endTrace({ name: TraceName.EarnFaqApys });
    }
  }, [activeTimespanApyAverage, reversedVaultApys]);

  const handleTimespanPressed = (numDataPointsToDisplay: number) => {
    setActiveTimespanApyAverage(
      parsedVaultTimespanApyAverages?.[numDataPointsToDisplay],
    );
  };

  const bodyTextStrings: StakingInfoStrings = useMemo(
    () => ({
      stakeAnyAmount: strings('stake.stake_any_amount_of_eth'),
      noMinimumRequired: strings('stake.no_minimum_required'),
      earnRewards: strings('stake.earn_eth_rewards'),
      earnRewardsDescription: strings('stake.earn_eth_rewards_description'),
      flexibleUnstaking: strings('stake.flexible_unstaking'),
      flexibleUnstakingDescription: strings(
        'stake.flexible_unstaking_description',
      ),
      disclaimer: strings('stake.disclaimer'),
    }),
    [],
  );

  return (
    <BottomSheet ref={sheetRef} isInteractable={false}>
      <ScrollView bounces={false}>
        <HeaderCenter
          title={strings('stake.stake_eth_and_earn')}
          onClose={handleClose}
        />
        {Boolean(reversedVaultApys.length) && activeTimespanApyAverage && (
          <InteractiveTimespanChart
            dataPoints={reversedVaultApys}
            yAccessor={(point) => new BigNumber(point.daily_apy).toNumber()}
            defaultTitle={`${formatPercent(
              activeTimespanApyAverage.apyAverage,
              {
                inputFormat: CommonPercentageInputUnits.PERCENTAGE,
                outputFormat: PercentageOutputFormat.PERCENT_SIGN,
                fixed: 1,
              },
            )} ${strings('stake.apr')}`}
            titleAccessor={(point) =>
              `${formatPercent(point.daily_apy, {
                inputFormat: CommonPercentageInputUnits.PERCENTAGE,
                outputFormat: PercentageOutputFormat.PERCENT_SIGN,
                fixed: 1,
              })} ${strings('stake.apr')}`
            }
            defaultSubtitle={activeTimespanApyAverage.label}
            subtitleAccessor={(point) => formatChartDate(point.timestamp)}
            onTimespanPressed={handleTimespanPressed}
            graphOptions={{
              ...getGraphInsetsByDataPointLength(
                activeTimespanApyAverage.numDays,
              ),
            }}
            color={colors.success.default}
            isLoading={isLoadingVaultApyAverages || isLoadingVaultApys}
          />
        )}
        <StakingInfoBodyText strings={bodyTextStrings} styles={styles} />
      </ScrollView>
      <LearnMoreModalFooter
        onClose={handleClose}
        learnMoreUrl={POOLED_STAKING_FAQ_URL}
        style={styles.footer}
      />
    </BottomSheet>
  );
};

export default PoolStakingLearnMoreModal;
