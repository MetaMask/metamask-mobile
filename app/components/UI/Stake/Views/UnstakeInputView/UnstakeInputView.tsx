import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
import UnstakeInputViewBanner from './UnstakeBanner';
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
import { View } from 'react-native';
import styleSheet from './UnstakeInputView.styles';
import InputDisplay from '../../components/InputDisplay';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import useUnstakingInputHandlers from '../../hooks/useUnstakingInput';
import { withMetaMetrics } from '../../utils/metaMetrics/withMetaMetrics';

const UnstakeInputView = () => {
  const title = strings('stake.unstake_eth');
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
      getStakingNavbar(title, navigation, theme.colors, {
        hasBackButton: false,
      }),
    );
  }, [navigation, theme.colors, title]);

  const handleUnstakePress = useCallback(() => {
    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.UNSTAKE_CONFIRMATION,
      params: {
        amountWei: amountWei.toString(),
        amountFiat: fiatAmount,
      },
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REVIEW_UNSTAKE_BUTTON_CLICKED)
        .addProperties({
          selected_provider: 'consensys',
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
            selected_provider: 'consensys',
            text: 'Currency Switch Trigger',
            location: 'Unstake Input View',
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
              location: 'UnstakeInputView',
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
