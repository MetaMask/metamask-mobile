import { useNavigation } from '@react-navigation/native';
import { BN } from 'ethereumjs-util';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
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
import AnnualRewardsRateCard from '../../components/AnnualRewardsRateCard';
import CurrencyToggle from '../../components/CurrencySwitch';
import QuickAmounts from '../../components/QuickAmounts';
import useBalance from '../../hooks/useBalance';
import styleSheet from './StakeInputView.styles';

const StakeInputView = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});

  const [amount, setAmount] = useState('0');
  const [amountBN, setAmountBN] = useState<BN>(new BN(0));
  const { balance, balanceBN } = useBalance();

  const isNonZeroAmount: boolean = amountBN.gt(new BN(0));
  const additionalFundsRequired = amountBN.sub(balanceBN || new BN(0));
  const isOverMaximum: boolean =
    isNonZeroAmount && additionalFundsRequired.gt(new BN(0));

  const [fiatAmount, setFiatAmount] = useState('0');
  const [isEth, setIsEth] = useState<boolean>(true);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate) || 1;

  useEffect(() => {
    navigation.setOptions(getStakeInputNavbar(navigation, theme.colors));
  }, [navigation, theme.colors]);

  /* Keypad Handlers */

  const handleKeypadChange = useCallback(
    ({ value }) => {
      if (isEth) {
        setAmount(value);
        setAmountBN(toWei(value, 'ether'));
        const fiatValue = weiToFiatNumber(
          toWei(value, 'ether'),
          conversionRate,
          2,
        ).toString();
        setFiatAmount(fiatValue);
      } else {
        setFiatAmount(value);
        const ethValue = renderFromTokenMinimalUnit(
          fiatNumberToWei(value, conversionRate).toString(),
          18,
          5,
        );

        setAmount(ethValue);
        setAmountBN(toWei(ethValue, 'ether'));
      }
    },
    [isEth, conversionRate],
  );

  const handleCurrencySwitch = useCallback(() => {
    setIsEth((prev) => {
      // When switching currencies, recalculate the values to update the input box properly
      if (prev) {
        const ethValue = fromTokenMinimalUnitString(
          fiatNumberToWei(fiatAmount || '0', conversionRate).toString(),
          18,
        );
        setAmount(limitToMaximumDecimalPlaces(Number(ethValue), 5));
      } else {
        const fiatValue = weiToFiatNumber(
          toWei(amount || '0', 'ether'),
          conversionRate,
          2,
        ).toString();
        setFiatAmount(fiatValue);
      }
      return !prev;
    });
  }, [amount, fiatAmount, conversionRate]);

  const handleStakePress = useCallback(() => {
    // Add your logic here
  }, []);

  const percentageOptions = [
    { value: 0.25, label: '25%' },
    { value: 0.5, label: '50%' },
    { value: 0.75, label: '75%' },
    { value: 1, label: 'Max' },
  ];

  const handleAmountPress = useCallback(
    ({ value }: { value: number }) => {
      const percentage = value * 100;
      const amountPercentage = balanceBN
        ?.mul(new BN(percentage))
        .div(new BN(100));

      if (!amountPercentage) {
        return;
      }

      const amountToSet = amountPercentage;

      const newAmountString = fromTokenMinimalUnitString(
        amountToSet.toString(10),
        18,
      );

      const newEthAmount = limitToMaximumDecimalPlaces(
        Number(newAmountString),
        5,
      );
      setAmount(newEthAmount);
      // Calculate and set the fiat amount
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
              Not enough ETH to complete this stake
            </Text>
          ) : (
            <Text variant={TextVariant.BodySM}>
              {'Balance : '}
              {balance}
            </Text>
          )}
        </View>
        <View style={styles.amountRow}>
          <Text variant={TextVariant.DisplayMD} color={TextColor.Muted}>
            {isEth
              ? `${amount} ETH`
              : `${fiatAmount} ${currentCurrency.toUpperCase()}`}
          </Text>
        </View>
        <View>
          <CurrencyToggle
            onPress={handleCurrencySwitch}
            value={
              isEth
                ? renderFiat(Number(fiatAmount), currentCurrency, 2)
                : `${amount} ETH`
            }
          />
        </View>
      </View>
      <View style={styles.rewardsRateContainer}>
        <AnnualRewardsRateCard annualRewardRate="2.6%" onIconPress={() => {}} />
      </View>
      <QuickAmounts
        disabled={false}
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
              ? 'Enter amount'
              : isOverMaximum
              ? 'Not enough ETH'
              : 'Review'
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
