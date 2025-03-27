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
import Routes from '../../../../../constants/navigation/Routes';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import Keypad from '../../../../Base/Keypad';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakingNavbar } from '../../../Navbar';
import ScreenLayout from '../../../Ramp/components/ScreenLayout';
import InputDisplay from '../../components/InputDisplay';
import QuickAmounts from '../../components/QuickAmounts';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';
import usePoolStakedUnstake from '../../hooks/usePoolStakedUnstake';
import useUnstakingInputHandlers from '../../hooks/useUnstakingInput';
import { withMetaMetrics } from '../../utils/metaMetrics/withMetaMetrics';
import UnstakeInputViewBanner from './UnstakeBanner';
import styleSheet from './UnstakeInputView.styles';
import { selectConfirmationRedesignFlags } from '../../../../../selectors/featureFlagController';

const UnstakeInputView = () => {
  const title = strings('stake.unstake_eth');
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { attemptUnstakeTransaction } = usePoolStakedUnstake();
  const activeAccount = useSelector(selectSelectedInternalAccount);
  const confirmationRedesignFlags = useSelector(
      selectConfirmationRedesignFlags,
    );

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
    handleQuickAmountPress,
    handleKeypadChange,
    stakedBalanceValue,
  } = useUnstakingInputHandlers();

  const stakedBalanceText = strings('stake.staked_balance');

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
            event: MetaMetricsEvents.UNSTAKE_CANCEL_CLICKED,
            properties: {
              selected_provider: EVENT_PROVIDERS.CONSENSYS,
              location: EVENT_LOCATIONS.UNSTAKE_INPUT_VIEW,
            },
          },
        },
      ),
    );
  }, [navigation, theme.colors, title]);

  const handleUnstakePress = useCallback(async () => {
    const isStakingDepositRedesignedEnabled =
      confirmationRedesignFlags?.staking_transactions;

    if (isStakingDepositRedesignedEnabled) {
      // Here we add the transaction to the transaction controller. The
      // redesigned confirmations architecture relies on the transaction
      // metadata object being defined by the time the confirmation is displayed
      // to the user.
      await attemptUnstakeTransaction(
        amountWei.toString(),
        activeAccount?.address as string,
      );

      navigation.navigate('StakeScreens', {
        screen: Routes.STANDALONE_CONFIRMATIONS.STAKE_WITHDRAWAL,
        params: {
          amountWei: amountWei.toString(),
          amountFiat: fiatAmount,
        },
      });
    } else {
      navigation.navigate('StakeScreens', {
        screen: Routes.STAKING.UNSTAKE_CONFIRMATION,
        params: {
          amountWei: amountWei.toString(),
          amountFiat: fiatAmount,
        },
      });
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REVIEW_UNSTAKE_BUTTON_CLICKED)
        .addProperties({
          selected_provider: EVENT_PROVIDERS.CONSENSYS,
          tokens_to_stake_native_value: amountEth,
          tokens_to_stake_usd_value: fiatAmount,
        })
        .build(),
    );
  }, [
    amountEth,
    amountWei,
    createEventBuilder,
    fiatAmount,
    navigation,
    trackEvent,
    attemptUnstakeTransaction,
    activeAccount?.address,
    confirmationRedesignFlags?.staking_transactions,
  ]);

  return (
    <ScreenLayout style={styles.container}>
      <InputDisplay
        isOverMaximum={isOverMaximum}
        balanceText={stakedBalanceText}
        balanceValue={stakedBalanceValue}
        isNonZeroAmount={isNonZeroAmount}
        amountEth={amountEth}
        fiatAmount={fiatAmount}
        isEth={isEth}
        currentCurrency={currentCurrency}
        handleCurrencySwitch={withMetaMetrics(handleCurrencySwitch, {
          event: MetaMetricsEvents.UNSTAKE_INPUT_CURRENCY_SWITCH_CLICKED,
          properties: {
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            text: 'Currency Switch Trigger',
            location: EVENT_LOCATIONS.UNSTAKE_INPUT_VIEW,
            // We want to track the currency switching to. Not the current currency.
            currency_type: isEth ? 'fiat' : 'native',
          },
        })}
        currencyToggleValue={currencyToggleValue}
      />
      <UnstakeInputViewBanner style={styles.unstakeBanner} />
      <QuickAmounts
        amounts={percentageOptions}
        onAmountPress={({ value }: { value: number }) =>
          withMetaMetrics(handleQuickAmountPress, {
            event: MetaMetricsEvents.UNSTAKE_INPUT_QUICK_AMOUNT_CLICKED,
            properties: {
              location: EVENT_LOCATIONS.UNSTAKE_INPUT_VIEW,
              amount: value,
              is_max: value === 1,
              mode: isEth ? 'native' : 'fiat',
            },
          })({ value })
        }
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
          onPress={handleUnstakePress}
        />
      </View>
    </ScreenLayout>
  );
};

export default UnstakeInputView;
