import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
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
import QuickAmounts from '../../../Stake/components/QuickAmounts';
import {
  EVENT_LOCATIONS,
  EVENT_PROVIDERS,
} from '../../../Stake/constants/events';
import usePoolStakedUnstake from '../../../Stake/hooks/usePoolStakedUnstake';
import useEarnWithdrawInput from '../../../Earn/hooks/useEarnWithdrawInput';
import { StakeNavigationParamsList } from '../../../Stake/types';
import { withMetaMetrics } from '../../../Stake/utils/metaMetrics/withMetaMetrics';
import UnstakeInputViewBanner from './UnstakeBanner';
import styleSheet from './EarnWithdrawInputView.styles';
import { EarnWithdrawInputViewProps } from './EarnWithdrawInputView.types';
import { useEarnTokenDetails } from '../../hooks/useEarnTokenDetails';
import { RootState } from '../../../../../reducers';
import { selectConversionRate } from '../../../../../selectors/currencyRateController';
import { Hex } from '@metamask/utils';
import { selectContractExchangeRatesByChainId } from '../../../../../selectors/tokenRatesController';
import { StackNavigationProp } from '@react-navigation/stack';
import { isStablecoinLendingFeatureEnabled } from '../../../Stake/constants';
import { selectConfirmationRedesignFlags } from '../../../../../selectors/featureFlagController/confirmations';

const EarnWithdrawInputView = () => {
  const route = useRoute<EarnWithdrawInputViewProps['route']>();
  const { token } = route.params;
  const { getTokenWithBalanceAndApr } = useEarnTokenDetails();
  const earnToken = getTokenWithBalanceAndApr(token);
  const title = strings('stake.unstake_eth');
  const navigation =
    useNavigation<StackNavigationProp<StakeNavigationParamsList>>();
  const { styles, theme } = useStyles(styleSheet, {});
  const { attemptUnstakeTransaction } = usePoolStakedUnstake();
  const activeAccount = useSelector(selectSelectedInternalAccount);
  const confirmationRedesignFlags = useSelector(
    selectConfirmationRedesignFlags,
  );

  const conversionRate = useSelector(selectConversionRate) ?? 1;
  const contractExchangeRates = useSelector((state: RootState) =>
    selectContractExchangeRatesByChainId(state, token.chainId as Hex),
  );
  const exchangeRate = contractExchangeRates?.[token.address as Hex]?.price;

  const { trackEvent, createEventBuilder } = useMetrics();

  const {
    isFiat,
    currentCurrency,
    isNonZeroAmount,
    amountToken,
    amountTokenMinimalUnit,
    amountFiatNumber,
    isOverMaximum,
    handleCurrencySwitch,
    currencyToggleValue,
    percentageOptions,
    handleQuickAmountPress,
    handleKeypadChange,
    earnBalanceValue,
  } = useEarnWithdrawInput({
    earnToken,
    conversionRate,
    exchangeRate,
  });

  const stakedBalanceText = strings('stake.staked_balance');

  const getButtonLabel = () => {
    if (!isNonZeroAmount) {
      return strings('stake.enter_amount');
    }
    if (isOverMaximum.isOverMaximumToken) {
      return strings('stake.not_enough_token', {
        ticker: earnToken.ticker ?? earnToken.symbol,
      });
    }
    if (isOverMaximum.isOverMaximumEth) {
      return strings('stake.not_enough_eth');
    }
    return strings('stake.review');
  };

  const buttonLabel = getButtonLabel();

  const stakingNavBarOptions = {
    hasCancelButton: true,
    hasBackButton: false,
  };
  const stakingNavBarEventOptions = {
    cancelButtonEvent: {
      event: MetaMetricsEvents.UNSTAKE_CANCEL_CLICKED,
      properties: {
        selected_provider: EVENT_PROVIDERS.CONSENSYS,
        location: EVENT_LOCATIONS.UNSTAKE_INPUT_VIEW,
      },
    },
  };
  const earnNavBarOptions = {
    hasCancelButton: false,
    hasBackButton: true,
    hasIconButton: true,
    // TODO: STAKE-903
    // handleIconPress: ???,
  };
  const earnNavBarEventOptions = {
    backButtonEvent: {
      event: MetaMetricsEvents.UNSTAKE_CANCEL_CLICKED,
      properties: {
        selected_provider: EVENT_PROVIDERS.CONSENSYS,
        location: EVENT_LOCATIONS.UNSTAKE_INPUT_VIEW,
      },
    },
    // TODO: STAKE-903
    // iconButtonEvent: {
    //   event: MetaMetricsEvents.TOOLTIP_OPENED,
    //   properties: {
    //     selected_provider: EVENT_PROVIDERS.CONSENSYS,
    //     text: 'Tooltip Opened',
    //     location: EVENT_LOCATIONS.UNSTAKE_CANCEL_CLICKED,
    //     tooltip_name: '???',
    //   },
    // },
  };
  const isStablecoinLendingEnabled = isStablecoinLendingFeatureEnabled();
  const navBarOptions = isStablecoinLendingEnabled
    ? earnNavBarOptions
    : stakingNavBarOptions;
  const navBarEventOptions = isStablecoinLendingEnabled
    ? earnNavBarEventOptions
    : stakingNavBarEventOptions;
  useEffect(() => {
    navigation.setOptions(
      getStakingNavbar(
        title,
        navigation,
        theme.colors,
        navBarOptions,
        navBarEventOptions,
      ),
    );
  }, [navigation, theme.colors, title, navBarOptions, navBarEventOptions]);

  const [
    isSubmittingStakeWithdrawalTransaction,
    setIsSubmittingStakeWithdrawalTransaction,
  ] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setIsSubmittingStakeWithdrawalTransaction(false);
    }, []),
  );

  const handleUnstakePress = useCallback(async () => {
    const isStakingDepositRedesignedEnabled =
      confirmationRedesignFlags?.staking_confirmations;

    const unstakeButtonClickEventProperties = {
      selected_provider: EVENT_PROVIDERS.CONSENSYS,
      tokens_to_stake_native_value: amountToken,
      tokens_to_stake_usd_value: amountFiatNumber,
    };

    if (isStakingDepositRedesignedEnabled) {
      // this prevents the user from adding the transaction withdrawal into the
      // controller state multiple times
      setIsSubmittingStakeWithdrawalTransaction(true);

      // Here we add the transaction to the transaction controller. The
      // redesigned confirmations architecture relies on the transaction
      // metadata object being defined by the time the confirmation is displayed
      // to the user.
      await attemptUnstakeTransaction(
        amountTokenMinimalUnit.toString(),
        activeAccount?.address as string,
      );

      navigation.navigate('StakeScreens', {
        screen: Routes.STANDALONE_CONFIRMATIONS.STAKE_WITHDRAWAL,
        params: {
          amountWei: amountTokenMinimalUnit.toString(),
          amountFiat: amountFiatNumber,
        },
      });

      const withRedesignedPropEventProperties = {
        ...unstakeButtonClickEventProperties,
        is_redesigned: true,
      };

      trackEvent(
        createEventBuilder(MetaMetricsEvents.REVIEW_UNSTAKE_BUTTON_CLICKED)
          .addProperties(withRedesignedPropEventProperties)
          .build(),
      );

      return;
    }

    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.UNSTAKE_CONFIRMATION,
      params: {
        amountWei: amountTokenMinimalUnit.toString(),
        amountFiat: amountFiatNumber,
      },
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.REVIEW_UNSTAKE_BUTTON_CLICKED)
        .addProperties(unstakeButtonClickEventProperties)
        .build(),
    );
  }, [
    amountToken,
    amountTokenMinimalUnit,
    createEventBuilder,
    amountFiatNumber,
    navigation,
    trackEvent,
    attemptUnstakeTransaction,
    activeAccount?.address,
    confirmationRedesignFlags?.staking_confirmations,
  ]);

  return (
    <ScreenLayout style={styles.container}>
      <InputDisplay
        isOverMaximum={isOverMaximum}
        balanceText={stakedBalanceText}
        balanceValue={earnBalanceValue}
        isNonZeroAmount={isNonZeroAmount}
        amountToken={amountToken}
        amountFiatNumber={amountFiatNumber}
        isFiat={isFiat}
        ticker={earnToken.ticker ?? earnToken.symbol}
        currentCurrency={currentCurrency}
        handleCurrencySwitch={withMetaMetrics(handleCurrencySwitch, {
          event: MetaMetricsEvents.UNSTAKE_INPUT_CURRENCY_SWITCH_CLICKED,
          properties: {
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            text: 'Currency Switch Trigger',
            location: EVENT_LOCATIONS.UNSTAKE_INPUT_VIEW,
            // We want to track the currency switching to. Not the current currency.
            currency_type: isFiat ? 'native' : 'fiat',
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
              mode: isFiat ? 'fiat' : 'native',
            },
          })({ value })
        }
      />
      <Keypad
        value={isFiat ? amountFiatNumber : amountToken}
        onChange={handleKeypadChange}
        style={styles.keypad}
        // TODO: this should be the underlying token symbol/ticker if not ETH
        // once this data is available in the state we can use that
        currency={token.isETH ? 'ETH' : token.ticker ?? token.symbol}
        decimals={isFiat ? 2 : 5}
      />
      <View style={styles.reviewButtonContainer}>
        <Button
          label={buttonLabel}
          size={ButtonSize.Lg}
          labelTextVariant={TextVariant.BodyMDMedium}
          variant={ButtonVariants.Primary}
          loading={isSubmittingStakeWithdrawalTransaction}
          isDisabled={
            isOverMaximum.isOverMaximumToken ||
            isOverMaximum.isOverMaximumEth ||
            !isNonZeroAmount ||
            isSubmittingStakeWithdrawalTransaction
          }
          width={ButtonWidthTypes.Full}
          onPress={handleUnstakePress}
        />
      </View>
    </ScreenLayout>
  );
};

export default EarnWithdrawInputView;
