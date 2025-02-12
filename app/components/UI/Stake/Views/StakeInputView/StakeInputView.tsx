import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
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
import { withMetaMetrics } from '../../utils/metaMetrics/withMetaMetrics';
import usePoolStakedDeposit from '../../hooks/usePoolStakedDeposit';
import { formatEther } from 'ethers/lib/utils';
import { EVENT_PROVIDERS, EVENT_LOCATIONS } from '../../constants/events';
import { selectConfirmationRedesignFlags } from '../../../../../selectors/featureFlagController';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';

const StakeInputView = () => {
  const title = strings('stake.stake_eth');
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();
  const { attemptDepositTransaction } = usePoolStakedDeposit();
  const confirmationRedesignFlags = useSelector(
    selectConfirmationRedesignFlags,
  );
  const isStakingDepositRedesignedEnabled =
    confirmationRedesignFlags?.staking_transactions;
  const activeAccount = useSelector(selectSelectedInternalAccount);


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
    handleQuickAmountPress,
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
    getDepositTxGasPercentage,
    estimatedGasFeeWei,
    isLoadingStakingGasFee,
  } = useStakingInputHandlers();

  const navigateToLearnMoreModal = () => {
    navigation.navigate('StakeModals', {
      screen: Routes.STAKING.MODALS.LEARN_MORE,
    });
  };

  const handleStakePress = useCallback(async () => {
    if (isStakingDepositRedesignedEnabled) {
      await attemptDepositTransaction(
        amountWei.toString(),
        activeAccount?.address as string,
      );
      return;
    }

    if (isHighGasCostImpact()) {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.STAKE_GAS_COST_IMPACT_WARNING_TRIGGERED,
        )
          .addProperties({
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            location: EVENT_LOCATIONS.STAKE_INPUT_VIEW,
            tokens_to_stake_native_value: amountEth,
            tokens_to_stake_usd_value: fiatAmount,
            estimated_gas_fee: formatEther(estimatedGasFeeWei.toString()),
            estimated_gas_percentage_of_deposit: `${getDepositTxGasPercentage()}%`,
          })
          .build(),
      );

      navigation.navigate('StakeModals', {
        screen: Routes.STAKING.MODALS.GAS_IMPACT,
        params: {
          amountWei: amountWei.toString(),
          amountFiat: fiatAmount,
          annualRewardsETH,
          annualRewardsFiat,
          annualRewardRate,
          estimatedGasFee: formatEther(estimatedGasFeeWei.toString()),
          estimatedGasFeePercentage: `${getDepositTxGasPercentage()}%`,
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
          selected_provider: EVENT_PROVIDERS.CONSENSYS,
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
    estimatedGasFeeWei,
    getDepositTxGasPercentage,
    isStakingDepositRedesignedEnabled,
    activeAccount,
    attemptDepositTransaction,
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
      getStakingNavbar(
        title,
        navigation,
        theme.colors,
        {
          hasBackButton: false,
        },
        {
          cancelButtonEvent: {
            event: MetaMetricsEvents.STAKE_CANCEL_CLICKED,
            properties: {
              selected_provider: EVENT_PROVIDERS.CONSENSYS,
              location: EVENT_LOCATIONS.STAKE_INPUT_VIEW,
            },
          },
        },
      ),
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
        handleCurrencySwitch={withMetaMetrics(handleCurrencySwitch, {
          event: MetaMetricsEvents.STAKE_INPUT_CURRENCY_SWITCH_CLICKED,
          properties: {
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            text: 'Currency Switch Trigger',
            location: EVENT_LOCATIONS.STAKE_INPUT_VIEW,
            // We want to track the currency switching to. Not the current currency.
            currency_type: isEth ? 'fiat' : 'native',
          },
        })}
        currencyToggleValue={currencyToggleValue}
      />
      <View style={styles.rewardsRateContainer}>
        <EstimatedAnnualRewardsCard
          estimatedAnnualRewards={estimatedAnnualRewards}
          onIconPress={withMetaMetrics(navigateToLearnMoreModal, {
            event: MetaMetricsEvents.TOOLTIP_OPENED,
            properties: {
              selected_provider: EVENT_PROVIDERS.CONSENSYS,
              text: 'Tooltip Opened',
              location: EVENT_LOCATIONS.STAKE_INPUT_VIEW,
              tooltip_name: 'MetaMask Pool Estimated Rewards',
            },
          })}
          isLoading={isLoadingVaultData}
        />
      </View>
      <QuickAmounts
        amounts={percentageOptions}
        onAmountPress={({ value }: { value: number }) =>
          withMetaMetrics(handleQuickAmountPress, {
            event: MetaMetricsEvents.STAKE_INPUT_QUICK_AMOUNT_CLICKED,
            properties: {
              location: EVENT_LOCATIONS.STAKE_INPUT_VIEW,
              amount: value,
              // onMaxPress is called instead when it's defined and the max is clicked.
              is_max: false,
              mode: isEth ? 'native' : 'fiat',
            },
          })({ value })
        }
        onMaxPress={withMetaMetrics(handleMaxButtonPress, {
          event: MetaMetricsEvents.STAKE_INPUT_QUICK_AMOUNT_CLICKED,
          properties: {
            location: EVENT_LOCATIONS.STAKE_INPUT_VIEW,
            is_max: true,
            mode: isEth ? 'native' : 'fiat',
          },
        })}
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
          isDisabled={
            isOverMaximum || !isNonZeroAmount || isLoadingStakingGasFee
          }
          width={ButtonWidthTypes.Full}
          onPress={handleStakePress}
        />
      </View>
    </ScreenLayout>
  );
};

export default StakeInputView;
