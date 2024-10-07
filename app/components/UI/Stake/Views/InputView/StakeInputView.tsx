import { useNavigation } from '@react-navigation/native';
import { BN } from 'ethereumjs-util';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  fiatNumberToWei,
  fromTokenMinimalUnitString,
  limitToMaximumDecimalPlaces,
  renderFiat,
  renderFromTokenMinimalUnit,
} from '../../../../../util/number';
import Keypad from '../../../../Base/Keypad';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakeInputNavbar } from '../../../Navbar';
import ScreenLayout from '../../../Ramp/components/ScreenLayout';
import CurrencyToggle from '../../components/CurrencySwitch';
import QuickAmounts from '../../components/QuickAmounts';
import styleSheet from './StakeInputView.styles';
import EstimatedAnnualRewardsCard from '../../components/EstimatedAnnualRewardsCard';
import Routes from '../../../../../constants/navigation/Routes';
import { useStakeContext } from '../../sdk';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';

const StakeInputView = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { trackEvent } = useMetrics();
  const {
    balance,
    balanceBN,
    balanceFiatNumber,
    sdkService,
    amount,
    setAmount,
    amountBN,
    setAmountBN,
    conversionRate,
    currentCurrency,
    fiatAmount,
    estimatedAnnualRewards,
    setEstimatedAnnualRewards
  } = useStakeContext();

  const isNonZeroAmount = useMemo(() => amountBN.gt(new BN(0)), [amountBN]);
  const isOverMaximum = useMemo(() => {
    const additionalFundsRequired = amountBN.sub(balanceBN || new BN(0));
    return isNonZeroAmount && additionalFundsRequired.gt(new BN(0));
  }, [amountBN, balanceBN, isNonZeroAmount]);

  const isEth = useMemo(() => currentCurrency === 'ETH', [currentCurrency]);
  const balanceText = useMemo(() => isEth
  ? `${balance} ETH`
  : `${balanceFiatNumber?.toString()} ${currentCurrency.toUpperCase()}`, [isEth, balanceFiatNumber, currentCurrency]);

  const currencyToggleValue = useMemo(() => isEth
  ? `${fiatAmount} ${currentCurrency.toUpperCase()}`
  : `${amount} ETH`, [isEth, fiatAmount, currentCurrency, amount]);

  const navigateToLearnMoreModal = () => {
    navigation.navigate('StakeModals', {
      screen: Routes.STAKING.MODALS.LEARN_MORE,
    });
  };

  const annualRewardRate = '0.026'; //TODO: Replace with actual value: STAKE-806
  const calculateEstimatedAnnualRewards = useCallback(() => {
    if (isNonZeroAmount) {
      // Limiting the decimal places to keep it consistent with other eth values in the input screen
      const ethRewards = limitToMaximumDecimalPlaces(
        parseFloat(amount) * parseFloat(annualRewardRate),
        5,
      );
      if (isEth) {
        setEstimatedAnnualRewards(`${ethRewards} ETH`);
      } else {
        const fiatRewards = renderFiat(
          parseFloat(fiatAmount) * parseFloat(annualRewardRate),
          currentCurrency,
          2,
        );
        setEstimatedAnnualRewards(`${fiatRewards}`);
      }
    } else {
      setEstimatedAnnualRewards(`${Number(annualRewardRate) * 100}%`);
    }
  }, [isNonZeroAmount, amount, isEth, fiatAmount, currentCurrency]);

  useEffect(() => {
    navigation.setOptions(getStakeInputNavbar(navigation, theme.colors));
  }, [navigation, theme.colors]);

  useEffect(() => {
    calculateEstimatedAnnualRewards();
  }, [
    amount,
    amountBN,
    isEth,
    conversionRate,
    calculateEstimatedAnnualRewards,
  ]);

  const handleEthInput = useCallback(
    (value: string) => {
      setAmount(value)
    },
    [setAmount],
  );

  const handleFiatInput = useCallback(
    (value: string) => {
      const ethValue = renderFromTokenMinimalUnit(
        fiatNumberToWei(value, conversionRate).toString(),
        18,
        5,
      );
      setAmount(ethValue)
    },
    [setAmount],
  );

  /* Keypad Handlers */
  const handleKeypadChange = useCallback(
    ({ value }) => {
      isEth ? handleEthInput(value) : handleFiatInput(value);
      trackEvent(MetaMetricsEvents.STAKE_INPUT_CLICKED, {
        selected_provider: 'consensys',
      });
    },
    [handleEthInput, handleFiatInput, isEth, trackEvent],
  );

  const handleCurrencySwitch = useCallback(() => {
  }, [isEth]);

  const handleStakePress = useCallback(() => {
    if (!sdkService) {
      return;
    }
    // TODO: Display the Review bottom sheet: STAKE-824
    // sdkService.estimateDepositGas()
  }, [sdkService]);

  const percentageOptions = [
    { value: 0.25, label: '25%' },
    { value: 0.5, label: '50%' },
    { value: 0.75, label: '75%' },
    { value: 1, label: 'Max' },
  ];

  const handleAmountPress = useCallback(
    ({ value }: { value: number }) => {
      if (!balanceBN) return;
      const percentage = value * 100;
      const amountPercentage = balanceBN
        ?.mul(new BN(percentage))
        .div(new BN(100));

      const newAmountString = fromTokenMinimalUnitString(
        amountPercentage.toString(10),
        18,
      );
      const newEthAmount = limitToMaximumDecimalPlaces(
        Number(newAmountString),
        5,
      );
      setAmount(newEthAmount);
      trackEvent(MetaMetricsEvents.STAKE_INPUT_TEXT_ENTERED, {
        selected_provider: 'consensys',
      });
    },
    [balanceBN, setAmount, trackEvent],
  );

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.inputContainer}>
        <View>
          {isOverMaximum ? (
            <Text variant={TextVariant.BodySM} color={TextColor.Error}>
              {strings('stake.not_enough_eth')}
            </Text>
          ) : (
            <Text variant={TextVariant.BodySM}>
              {strings('stake.balance')}
              {': '}
              {balanceText}
            </Text>
          )}
        </View>
        <View style={styles.amountRow}>
          <Text
            color={isNonZeroAmount ? TextColor.Default : TextColor.Muted}
            variant={TextVariant.DisplayMD}
          >
            {isEth ? amount : fiatAmount}
          </Text>
          <Text color={TextColor.Muted} variant={TextVariant.DisplayMD}>
            {isEth ? 'ETH' : currentCurrency.toUpperCase()}
          </Text>
        </View>
        <View>
          <CurrencyToggle
            onPress={handleCurrencySwitch}
            value={currencyToggleValue}
          />
        </View>
      </View>
      <View style={styles.rewardsRateContainer}>
        <EstimatedAnnualRewardsCard
          estimatedAnnualRewards={estimatedAnnualRewards}
          onIconPress={navigateToLearnMoreModal}
        />
      </View>
      <QuickAmounts
        amounts={percentageOptions}
        onAmountPress={handleAmountPress}
      />
      <Keypad
        value={isEth ? amount : fiatAmount}
        onChange={handleKeypadChange}
        style={styles.keypad}
        currency={'ETH'}
        decimals={isEth ? 5 : 2}
      />
      <View style={styles.reviewButtonContainer}>
        <Button
          label={
            !isNonZeroAmount
              ? strings('stake.enter_amount')
              : isOverMaximum
              ? strings('stake.not_enough_eth')
              : strings('stake.review')
          }
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
