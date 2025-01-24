import React, { useCallback, useRef } from 'react';
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
import styleSheet from './GasImpactModal.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { GasImpactModalProps } from './GasImpactModal.types';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { formatEther } from 'ethers/lib/utils';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';

const GasImpactModal = ({ route }: GasImpactModalProps) => {
  const { styles } = useStyles(styleSheet, {});

  const { navigate } = useNavigation();

  const { trackEvent, createEventBuilder } = useMetrics();

  const sheetRef = useRef<BottomSheetRef>(null);

  const {
    amountWei,
    annualRewardRate,
    annualRewardsFiat,
    annualRewardsETH,
    amountFiat,
    estimatedGasFee,
    estimatedGasFeePercentage,
  } = route.params;

  const metricsEvent = useCallback(
    (
      eventName:
        | typeof MetaMetricsEvents.STAKE_GAS_COST_IMPACT_CANCEL_CLICKED
        | typeof MetaMetricsEvents.STAKE_GAS_COST_IMPACT_PROCEEDED_CLICKED,
    ) => {
      trackEvent(
        createEventBuilder(eventName)
          .addProperties({
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            location: EVENT_LOCATIONS.GAS_IMPACT_MODAL,
            tokens_to_stake_native_value: formatEther(amountWei),
            tokens_to_stake_usd_value: amountFiat,
            estimated_gas_fee: estimatedGasFee,
            estimated_gas_percentage_of_deposit: estimatedGasFeePercentage,
          })
          .build(),
      );
    },
    [
      amountFiat,
      amountWei,
      createEventBuilder,
      estimatedGasFee,
      estimatedGasFeePercentage,
      trackEvent,
    ],
  );

  const handleClose = () => {
    metricsEvent(MetaMetricsEvents.STAKE_GAS_COST_IMPACT_CANCEL_CLICKED);
    sheetRef.current?.onCloseBottomSheet();
  };

  const handleNavigateToStakeReviewScreen = () => {
    metricsEvent(MetaMetricsEvents.STAKE_GAS_COST_IMPACT_PROCEEDED_CLICKED);
    navigate('StakeScreens', {
      screen: Routes.STAKING.STAKE_CONFIRMATION,
      params: {
        amountWei: amountWei.toString(),
        amountFiat,
        annualRewardsETH,
        annualRewardsFiat,
        annualRewardRate,
      },
    });
  };

  const footerButtons: ButtonProps[] = [
    {
      variant: ButtonVariants.Secondary,
      label: (
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
          {strings('stake.cancel')}
        </Text>
      ),
      size: ButtonSize.Lg,
      onPress: handleClose,
    },
    {
      variant: ButtonVariants.Primary,
      label: (
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Inverse}>
          {strings('stake.proceed_anyway')}
        </Text>
      ),
      labelTextVariant: TextVariant.BodyMDMedium,
      size: ButtonSize.Lg,
      onPress: handleNavigateToStakeReviewScreen,
    },
  ];

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.container}>
        <BottomSheetHeader onClose={handleClose}>
          <Text variant={TextVariant.HeadingMD}>
            {strings('stake.gas_cost_impact')}
          </Text>
        </BottomSheetHeader>
        <Text style={styles.content}>
          {strings('stake.gas_cost_impact_warning')}
        </Text>
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Horizontal}
          buttonPropsArray={footerButtons}
          style={styles.footer}
        />
      </View>
    </BottomSheet>
  );
};

export default GasImpactModal;
