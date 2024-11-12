import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import Keypad from '../../../../Base/Keypad';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakingNavbar } from '../../../Navbar';
import ScreenLayout from '../../../Ramp/components/ScreenLayout';
import QuickAmounts from '../../components/QuickAmounts';
import EstimatedAnnualRewardsCard from '../../components/EstimatedAnnualRewardsCard';
import Routes from '../../../../../constants/navigation/Routes';
import styleSheet from './StakeInputView.styles';
import useStakingInputHandlers from '../../hooks/useStakingInput';
import InputDisplay from '../../components/InputDisplay';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';

const StakeInputView = () => {
  const title = strings('stake.stake_eth');
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();

  const {
    isEth,
    currentCurrency,
    isNonZeroAmount,
    amountEth,
    amountWei,
    fiatAmount,
    isOverMaximum,
    handleCurrencySwitch,
    currencyToggleValue,
    percentageOptions,
    handleAmountPress,
    handleKeypadChange,
    calculateEstimatedAnnualRewards,
    estimatedAnnualRewards,
    annualRewardsETH,
    annualRewardsFiat,
    annualRewardRate,
    isLoadingVaultData,
    handleMax,
    balanceValue,
    isHighGasCostImpact,
  } = useStakingInputHandlers();

  const navigateToLearnMoreModal = () => {
    navigation.navigate('StakeModals', {
      screen: Routes.STAKING.MODALS.LEARN_MORE,
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.STAKE_LEARN_MORE_CLICKED)
        .addProperties({
          selected_provider: 'consensys',
          text: 'Tooltip Question Mark Trigger',
          location: 'Stake Input View',
        })
        .build(),
    );
  };

  const handleStakePress = useCallback(() => {
    if (isHighGasCostImpact()) {
      navigation.navigate('StakeModals', {
        screen: Routes.STAKING.MODALS.GAS_IMPACT,
        params: {
          amountWei: amountWei.toString(),
          amountFiat: fiatAmount,
          annualRewardsETH,
          annualRewardsFiat,
          annualRewardRate,
        },
      });
      return;
    }

    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.STAKE_CONFIRMATION,
      params: {
        amountWei: amountWei.toString(),
        amountFiat: fiatAmount,
        annualRewardsETH,
        annualRewardsFiat,
        annualRewardRate,
      },
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REVIEW_STAKE_BUTTON_CLICKED)
        .addProperties({
          selected_provider: 'consensys',
          tokens_to_stake_native_value: amountEth,
          tokens_to_stake_usd_value: fiatAmount,
        })
        .build(),
    );
  }, [
    isHighGasCostImpact,
    navigation,
    amountWei,
    fiatAmount,
    annualRewardsETH,
    annualRewardsFiat,
    annualRewardRate,
    trackEvent,
    createEventBuilder,
    amountEth,
  ]);

  const handleMaxButtonPress = () => {
    navigation.navigate('StakeModals', {
      screen: Routes.STAKING.MODALS.MAX_INPUT,
      params: {
        handleMaxPress: handleMax,
      },
    });
  };

  const balanceText = strings('stake.balance');

  const buttonLabel = !isNonZeroAmount
    ? strings('stake.enter_amount')
    : isOverMaximum
    ? strings('stake.not_enough_eth')
    : strings('stake.review');

  useEffect(() => {
    navigation.setOptions(
      getStakingNavbar(title, navigation, theme.colors, {
        hasBackButton: false,
      }),
    );
  }, [navigation, theme.colors, title]);

  useEffect(() => {
    calculateEstimatedAnnualRewards();
  }, [amountEth, amountWei, isEth, calculateEstimatedAnnualRewards]);

  return (
    <ScreenLayout style={styles.container}>
      <InputDisplay
        isOverMaximum={isOverMaximum}
        balanceText={balanceText}
        balanceValue={balanceValue}
        isNonZeroAmount={isNonZeroAmount}
        amountEth={amountEth}
        fiatAmount={fiatAmount}
        isEth={isEth}
        currentCurrency={currentCurrency}
        handleCurrencySwitch={handleCurrencySwitch}
        currencyToggleValue={currencyToggleValue}
      />
      <View style={styles.rewardsRateContainer}>
        <EstimatedAnnualRewardsCard
          estimatedAnnualRewards={estimatedAnnualRewards}
          onIconPress={navigateToLearnMoreModal}
          isLoading={isLoadingVaultData}
        />
      </View>
      <QuickAmounts
        amounts={percentageOptions}
        onAmountPress={handleAmountPress}
        onMaxPress={handleMaxButtonPress}
      />
      <Keypad
        value={isEth ? amountEth : fiatAmount}
        onChange={handleKeypadChange}
        style={styles.keypad}
        currency={'ETH'}
        decimals={isEth ? 5 : 2}
      />
      <View style={styles.reviewButtonContainer}>
        <Button
          label={buttonLabel}
          size={ButtonSize.Lg}
          labelTextVariant={TextVariant.BodyMDMedium}
          variant={ButtonVariants.Primary}
          isDisabled={isOverMaximum || !isNonZeroAmount}
          width={ButtonWidthTypes.Full}
          onPress={handleStakePress}
        />
      </View>
    </ScreenLayout>
  );
};

export default StakeInputView;
