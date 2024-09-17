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
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import {
  fiatNumberToWei,
  fromTokenMinimalUnitString,
  limitToMaximumDecimalPlaces,
  renderFiat,
  renderFromTokenMinimalUnit,
  toWei,
  weiToFiatNumber,
} from '../../../../../util/number';
import Keypad from '../../../../Base/Keypad';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakeInputNavbar } from '../../../Navbar';
import ScreenLayout from '../../../Ramp/components/ScreenLayout';
import CurrencyToggle from '../../components/CurrencySwitch';
import QuickAmounts from '../../components/QuickAmounts';
import useBalance from '../../hooks/useBalance';
import styleSheet from './StakeInputView.styles';
import EstimatedAnnualRewardsCard from '../../components/EstimatedAnnualRewardsCard';

const StakeInputView = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});

  const [amount, setAmount] = useState('0');
  const [amountBN, setAmountBN] = useState<BN>(new BN(0));
  const { balance, balanceBN, balanceFiatNumber } = useBalance();
  const [estimatedAnnualRewards, setEstimatedAnnualRewards] = useState('-');

  const isNonZeroAmount = useMemo(() => amountBN.gt(new BN(0)), [amountBN]);
  const isOverMaximum = useMemo(() => {
    const additionalFundsRequired = amountBN.sub(balanceBN || new BN(0));
    return isNonZeroAmount && additionalFundsRequired.gt(new BN(0));
  }, [amountBN, balanceBN, isNonZeroAmount]);

  const [fiatAmount, setFiatAmount] = useState('0');
  const [isEth, setIsEth] = useState<boolean>(true);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate) || 1;

  const balanceText = isEth
    ? `${balance} ETH`
    : `${balanceFiatNumber?.toString()} ${currentCurrency.toUpperCase()}`;

  const currencyToggleValue = isEth
    ? `${fiatAmount} ${currentCurrency.toUpperCase()}`
    : `${amount} ETH`;

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
      setAmount(value);
      setAmountBN(toWei(value, 'ether'));
      const fiatValue = weiToFiatNumber(
        toWei(value, 'ether'),
        conversionRate,
        2,
      ).toString();
      setFiatAmount(fiatValue);
    },
    [conversionRate],
  );

  const handleFiatInput = useCallback(
    (value: string) => {
      setFiatAmount(value);
      const ethValue = renderFromTokenMinimalUnit(
        fiatNumberToWei(value, conversionRate).toString(),
        18,
        5,
      );

      setAmount(ethValue);
      setAmountBN(toWei(ethValue, 'ether'));
    },
    [conversionRate],
  );

  /* Keypad Handlers */
  const handleKeypadChange = useCallback(
    ({ value }) => {
      isEth ? handleEthInput(value) : handleFiatInput(value);
    },
    [handleEthInput, handleFiatInput, isEth],
  );

  const handleCurrencySwitch = useCallback(() => {
    setIsEth(!isEth);
  }, [isEth]);

  const handleStakePress = useCallback(() => {
    // TODO: Display the Review bottom sheet: STAKE-824
  }, []);

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
      setAmountBN(amountPercentage);

      const newFiatAmount = weiToFiatNumber(
        toWei(newEthAmount.toString(), 'ether'),
        conversionRate,
        2,
      ).toString();
      setFiatAmount(newFiatAmount);
    },
    [balanceBN, conversionRate],
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
          onIconPress={() => {
            // TODO: Add tooltip modal
          }}
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
