import React, { useEffect, useMemo, useRef, useState } from 'react';
import styleSheet from './LendingLearnMoreModal.styles';
import { useStyles } from '../../../hooks/useStyles';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { Linking, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
  ButtonProps,
} from '../../../../component-library/components/Buttons/Button/Button.types';
import { EARN_URLS } from '../constants/urls';
import InteractiveTimespanChart from '../../Stake/components/PoolStakingLearnMoreModal/InteractiveTimespanChart';
import { EarnTokenDetails, LendingProtocol } from '../types/lending.types';
import { HistoricLendingMarketApyAverages } from '@metamask/stake-sdk';
import { RouteProp, useRoute } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import {
  formatChartDate,
  getGraphInsetsByDataPointLength,
} from '../../Stake/components/PoolStakingLearnMoreModal/InteractiveTimespanChart/InteractiveTimespanChart.utils';
import {
  CommonPercentageInputUnits,
  formatPercent,
  PercentageOutputFormat,
} from '../../Stake/utils/value';
import { isEmpty } from 'lodash';
import Icon, {
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import useLendingMarketApys from '../hooks/useLendingMarketApys';
import { capitalize } from '../../../../util/general';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

interface BodyTextProps {
  assetSymbol: string;
  protocol: string;
}

const BodyText = ({ assetSymbol, protocol }: BodyTextProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.bodyTextContainer}>
      <View style={styles.row}>
        <Icon name={IconName.Plant} />
        {/* Text Container */}
        <View>
          <Text variant={TextVariant.HeadingSM}>
            {strings(
              'earn.market_historic_apr_modal.earn_rewards_on_your_token',
              { tokenSymbol: assetSymbol },
            )}
          </Text>
          <Text color={TextColor.Alternative}>
            {strings(
              'earn.market_historic_apr_modal.lend_and_earn_daily_rewards',
              { tokenSymbol: assetSymbol, protocol: capitalize(protocol) },
            )}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <Icon name={IconName.Clock} style={styles.icon} />
        <View>
          <Text variant={TextVariant.HeadingSM}>
            {strings(
              'earn.market_historic_apr_modal.withdraw_whenever_you_want',
            )}
          </Text>
          <Text color={TextColor.Alternative}>
            {' '}
            {strings(
              'earn.market_historic_apr_modal.get_asset_back_in_your_wallet_instantly',
              { tokenSymbol: assetSymbol },
            )}
          </Text>
        </View>
      </View>
    </View>
  );
};

const parseMarketLendingApyAverages = (
  lendingMarketApyAverages: HistoricLendingMarketApyAverages,
) => {
  const numDaysMap: Record<
    keyof HistoricLendingMarketApyAverages,
    { numDays: number; label: string }
  > = {
    sevenDay: { numDays: 7, label: strings('stake.one_week_average') },
    thirtyDay: { numDays: 30, label: strings('stake.one_month_average') },
    ninetyDay: { numDays: 90, label: strings('stake.three_month_average') },
  };

  // Appends APR value to numDaysMap
  return Object.entries(lendingMarketApyAverages).reduce<
    Record<number, { apyAverage: string; numDays: number; label: string }>
  >((map, [key, { totalSupplyRate }]) => {
    const numDaysMapEntry = numDaysMap[key as keyof typeof numDaysMap];
    map[numDaysMapEntry.numDays] = {
      apyAverage: totalSupplyRate.toString(),
      ...numDaysMapEntry,
    };
    return map;
  }, {});
};

interface EarnLendingLearnMoreModalRouteParams {
  asset: EarnTokenDetails;
}

type EarnLendingLearnMoreModalRouteProp = RouteProp<
  { params: EarnLendingLearnMoreModalRouteParams },
  'params'
>;

const CHART_HEIGHT = 300; // Adjust to your chart's height

export const LendingLearnMoreModal = () => {
  const { styles } = useStyles(styleSheet, {});

  const route = useRoute<EarnLendingLearnMoreModalRouteProp>();

  const sheetRef = useRef<BottomSheetRef>(null);

  const handleClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  const {
    isLoading: isLoadingMarketApys,
    marketApys,
    marketApyAverages,
  } = useLendingMarketApys({
    asset: route?.params?.asset,
  });

  const reversedMarketApys = useMemo(
    () => (marketApys?.length ? [...marketApys].reverse() : []),
    [marketApys],
  );

  const parsedVaultTimespanApyAverages = useMemo(() => {
    if (isLoadingMarketApys || isEmpty(marketApyAverages)) return;
    return parseMarketLendingApyAverages(marketApyAverages);
  }, [isLoadingMarketApys, marketApyAverages]);

  const [activeTimespanApyAverage, setActiveTimespanApyAverage] = useState(
    parsedVaultTimespanApyAverages?.[7],
  );

  useEffect(() => {
    if (parsedVaultTimespanApyAverages) {
      setActiveTimespanApyAverage(parsedVaultTimespanApyAverages?.[7]);
    }
  }, [parsedVaultTimespanApyAverages]);

  const handleRedirectToLearnMore = () =>
    Linking.openURL(EARN_URLS.LENDING_FAQ);

  const footerButtons: ButtonProps[] = [
    {
      variant: ButtonVariants.Secondary,
      label: strings('stake.learn_more'),
      size: ButtonSize.Lg,
      labelTextVariant: TextVariant.BodyMDMedium,
      onPress: handleRedirectToLearnMore,
    },
    {
      variant: ButtonVariants.Primary,
      label: strings('stake.got_it'),
      labelTextVariant: TextVariant.BodyMDMedium,
      size: ButtonSize.Lg,
      onPress: handleClose,
    },
  ];

  const handleTimespanPressed = (numDataPointsToDisplay: number) => {
    setActiveTimespanApyAverage(
      parsedVaultTimespanApyAverages?.[numDataPointsToDisplay],
    );
  };

  // Chart reveal animation
  const chartReveal = useSharedValue(0);

  const showChart = useMemo(
    () =>
      Boolean(
        Boolean(reversedMarketApys) &&
          reversedMarketApys !== null &&
          activeTimespanApyAverage,
      ),
    [activeTimespanApyAverage, reversedMarketApys],
  );

  useEffect(() => {
    if (showChart) {
      chartReveal.value = withTiming(1, { duration: 350 });
    }
  }, [showChart, chartReveal]);

  const animatedChartContainerStyle = useAnimatedStyle(() => ({
    height: chartReveal.value * CHART_HEIGHT,
    opacity: chartReveal.value,
    transform: [
      {
        // Slides up as it appears
        translateY: (1 - chartReveal.value) * 20,
      },
    ],
    overflow: 'hidden',
  }));

  return (
    <BottomSheet ref={sheetRef} isInteractable={false}>
      <View>
        <BottomSheetHeader onClose={handleClose}>
          <Text variant={TextVariant.HeadingSM}>
            {strings('earn.how_it_works')}
          </Text>
        </BottomSheetHeader>
        <Animated.View style={animatedChartContainerStyle}>
          {showChart && (
            <InteractiveTimespanChart
              dataPoints={reversedMarketApys}
              yAccessor={(point) =>
                new BigNumber(point.netSupplyRate).toNumber()
              }
              defaultTitle={`${formatPercent(
                activeTimespanApyAverage?.apyAverage ?? '',
                {
                  inputFormat: CommonPercentageInputUnits.PERCENTAGE,
                  outputFormat: PercentageOutputFormat.PERCENT_SIGN,
                  fixed: 1,
                },
              )} ${strings('stake.apr')}`}
              titleAccessor={(point) =>
                `${formatPercent(point.netSupplyRate, {
                  inputFormat: CommonPercentageInputUnits.PERCENTAGE,
                  outputFormat: PercentageOutputFormat.PERCENT_SIGN,
                  fixed: 1,
                })} ${strings('stake.apr')}`
              }
              defaultSubtitle={activeTimespanApyAverage?.label ?? ''}
              subtitleAccessor={(point) =>
                formatChartDate(new Date(point.timestamp * 1000).toISOString())
              }
              onTimespanPressed={handleTimespanPressed}
              graphOptions={{
                ...getGraphInsetsByDataPointLength(
                  activeTimespanApyAverage?.numDays ?? 0,
                ),
                timespanButtons: [
                  {
                    label: strings(
                      'stake.interactive_chart.timespan_buttons.7D',
                    ),
                    value: 7,
                  },
                  {
                    label: strings(
                      'stake.interactive_chart.timespan_buttons.1M',
                    ),
                    value: 30,
                  },
                  {
                    label: strings(
                      'stake.interactive_chart.timespan_buttons.3M',
                    ),
                    value: 90,
                  },
                ],
              }}
              isLoading={isLoadingMarketApys}
            />
          )}
        </Animated.View>
        <BodyText
          assetSymbol={route?.params?.asset?.symbol}
          protocol={
            route?.params?.asset?.experience?.market
              ?.protocol as LendingProtocol
          }
        />
      </View>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={footerButtons}
        style={styles.footer}
      />
    </BottomSheet>
  );
};

export default LendingLearnMoreModal;
