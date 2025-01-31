import React, { useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { View } from 'react-native';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonProps,
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button/Button.types';
import { useNavigation } from '@react-navigation/native';
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

  const sheetRef = useRef<BottomSheetRef>(null);

  const { vaultApys, isLoadingVaultApys, refreshVaultApys } = useVaultApys();

  const {
    vaultApyAverages,
    isLoadingVaultApyAverages,
    refreshVaultApyAverages,
  } = useVaultApyAverages();

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

  useEffect(() => {
    async function refreshGraphData() {
      await Promise.all([refreshVaultApyAverages(), refreshVaultApys()]).catch(
        (err) =>
          console.error(
            'Failed to refresh Pool-Staking Learn More Modal Data: ',
            err,
          ),
      );
    }

    refreshGraphData();
  }, [refreshVaultApyAverages, refreshVaultApys]);

  const handleClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

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
      <View>
        <BottomSheetHeader onClose={handleClose}>
          <Text variant={TextVariant.HeadingSM}>
            {strings('stake.stake_eth_and_earn')}
          </Text>
        </BottomSheetHeader>
        {Boolean(vaultApys.length) && activeTimespanApyAverage && (
          <InteractiveTimespanChart
            dataPoints={vaultApys}
            yAccessor={(point) => new BigNumber(point.daily_apy).toNumber()}
            defaultTitle={`${new BigNumber(
              activeTimespanApyAverage.apyAverage,
            ).toFixed(2, BigNumber.ROUND_DOWN)}% ${strings('stake.apr')}`}
            titleAccessor={(point) =>
              `${new BigNumber(point.daily_apy).toFixed(
                2,
                BigNumber.ROUND_DOWN,
              )}% ${strings('stake.apr')}`
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
      </View>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={footerButtons}
        style={styles.footer}
      />
    </BottomSheet>
  );
};

export default PoolStakingLearnMoreModal;
