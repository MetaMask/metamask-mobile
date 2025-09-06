import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { formatEther } from 'ethers/lib/utils';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { selectConfirmationRedesignFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
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
import { GasImpactModalProps } from './GasImpactModal.types';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';
import usePoolStakedDeposit from '../../hooks/usePoolStakedDeposit';
import { EVM_SCOPE } from '../../../Earn/constants/networks';

const GasImpactModal = ({ route }: GasImpactModalProps) => {
  const { styles } = useStyles(styleSheet, {});
  const confirmationRedesignFlags = useSelector(
    selectConfirmationRedesignFlags,
  );
  const isStakingDepositRedesignedEnabled =
    confirmationRedesignFlags?.staking_confirmations;
  const { attemptDepositTransaction } = usePoolStakedDeposit();
  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );
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
    chainId,
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

  const handleNavigateToStakeReviewScreen = useCallback(async () => {
    const amountWeiString = amountWei.toString();

    if (isStakingDepositRedesignedEnabled) {
      if (!attemptDepositTransaction) return;

      try {
        await attemptDepositTransaction(
          amountWeiString,
          selectedAccount?.address as string,
        );
        navigate('StakeScreens', {
          screen: 'RedesignedConfirmations',
        });
      } catch (error) {
        console.error(error);
      }
    } else {
      navigate('StakeScreens', {
        screen: 'StakeConfirmation',
        params: {
          amountWei: amountWeiString,
          amountFiat,
          annualRewardsETH,
          annualRewardsFiat,
          annualRewardRate,
          chainId,
        },
      });
    }
    metricsEvent(MetaMetricsEvents.STAKE_GAS_COST_IMPACT_PROCEEDED_CLICKED);
  }, [
    amountWei,
    isStakingDepositRedesignedEnabled,
    metricsEvent,
    attemptDepositTransaction,
    selectedAccount?.address,
    navigate,
    amountFiat,
    annualRewardsETH,
    annualRewardsFiat,
    annualRewardRate,
    chainId,
  ]);

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
          {strings('stake.gas_cost_impact_warning', { percentOverDeposit: 30 })}
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
