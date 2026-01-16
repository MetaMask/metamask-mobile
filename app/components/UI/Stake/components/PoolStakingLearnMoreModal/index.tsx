import React, { useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonProps,
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button/Button.types';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { POOLED_STAKING_FAQ_URL } from '../../constants';
import styleSheet from './PoolStakingLearnMoreModal.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import useVaultApys from '../../hooks/useVaultApys';
import InteractiveTimespanChart from './InteractiveTimespanChart';
import BigNumber from 'bignumber.js';
import {
  formatChartDate,
  getGraphInsetsByDataPointLength,
} from './InteractiveTimespanChart/InteractiveTimespanChart.utils';
import { strings } from '../../../../../../locales/i18n';
import { parseVaultApyAveragesResponse } from './PoolStakingLearnMoreModal.utils';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';
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

interface PoolStakingLearnMoreModalRouteParams {
  chainId: Hex;
}

type PoolStakingLearnMoreModalRouteProp = RouteProp<
  { params: PoolStakingLearnMoreModalRouteParams },
  'params'
>;

const BodyText = () => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.bodyTextContainer}>
      <Text variant={TextVariant.BodyMDMedium}>
        {strings('stake.stake_any_amount_of_eth')}{' '}
        <Text color={TextColor.Alternative}>
          {strings('stake.no_minimum_required')}
        </Text>
      </Text>
      <Text variant={TextVariant.BodyMDMedium}>
        {strings('stake.earn_eth_rewards')}{' '}
        <Text color={TextColor.Alternative}>
          {strings('stake.earn_eth_rewards_description')}
        </Text>
      </Text>
      <Text variant={TextVariant.BodyMDMedium}>
        {strings('stake.flexible_unstaking')}{' '}
        <Text color={TextColor.Alternative}>
          {strings('stake.flexible_unstaking_description')}
        </Text>
      </Text>
      <Text
        variant={TextVariant.BodySM}
        color={TextColor.Alternative}
        style={styles.italicText}
      >
        {strings('stake.disclaimer')}
      </Text>
    </View>
  );
};

const PoolStakingLearnMoreModal = () => {
  const { styles } = useStyles(styleSheet, {});

  const { trackEvent, createEventBuilder } = useMetrics();

  const { navigate } = useNavigation();

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

  const redirectToLearnMore = () => {
    navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: POOLED_STAKING_FAQ_URL,
      },
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.STAKE_LEARN_MORE_CLICKED)
        .addProperties({
          selected_provider: EVENT_PROVIDERS.CONSENSYS,
          text: 'Learn More',
          location: EVENT_LOCATIONS.LEARN_MORE_MODAL,
        })
        .build(),
    );
  };

  const footerButtons: ButtonProps[] = [
    {
      variant: ButtonVariants.Secondary,
      label: strings('stake.learn_more'),
      size: ButtonSize.Lg,
      labelTextVariant: TextVariant.BodyMDMedium,
      onPress: redirectToLearnMore,
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

  return (
    <BottomSheet ref={sheetRef} isInteractable={false}>
      <ScrollView bounces={false}>
        <BottomSheetHeader onClose={handleClose}>
          <Text variant={TextVariant.HeadingSM}>
            {strings('stake.stake_eth_and_earn')}
          </Text>
        </BottomSheetHeader>
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
            isLoading={isLoadingVaultApyAverages || isLoadingVaultApys}
          />
        )}
        <BodyText />
      </ScrollView>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={footerButtons}
        style={styles.footer}
      />
    </BottomSheet>
  );
};

export default PoolStakingLearnMoreModal;
