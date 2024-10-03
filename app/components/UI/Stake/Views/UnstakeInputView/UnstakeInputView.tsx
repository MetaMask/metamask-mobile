import { useNavigation } from '@react-navigation/native';
import { BN } from 'ethereumjs-util';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import {
  selectCurrentCurrency,
  selectConversionRate,
} from '../../../../../selectors/currencyRateController';
import {
  limitToMaximumDecimalPlaces,
  toWei,
  weiToFiatNumber,
  renderFromTokenMinimalUnit,
  fiatNumberToWei,
  fromTokenMinimalUnitString,
  renderFromWei,
} from '../../../../../util/number';
import Keypad from '../../../../Base/Keypad';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakingNavbar } from '../../../Navbar';
import ScreenLayout from '../../../Ramp/components/ScreenLayout';
import CurrencyToggle from '../../components/CurrencySwitch';
import QuickAmounts from '../../components/QuickAmounts';
import styleSheet from '../InputView/StakeInputView.styles';

const UnstakeInputView = () => {
  const title = strings('stake.unstake_eth');
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});

  const [unstakeAmount, setUnstakeAmount] = useState('0');
  const [unstakeAmountBN, setUnstakeAmountBN] = useState<BN>(new BN(0));

  const [fiatAmount, setFiatAmount] = useState('0');
  const [isEth, setIsEth] = useState<boolean>(true);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate) || 1;

  const stakeBalance = '4599964000000000000'; //TODO: Replace with actual balance - STAKE-806
  const stakeBalanceInEth = renderFromWei(stakeBalance, 5);
  const stakeBalanceFiatNumber = weiToFiatNumber(stakeBalance, conversionRate);

  const isNonZeroAmount: boolean = unstakeAmountBN.gt(new BN(0));
  const isOverMaximum: boolean =
    isNonZeroAmount && unstakeAmountBN.sub(new BN(stakeBalance)).gt(new BN(0));

  const stakedBalanceText = isEth
    ? `${stakeBalanceInEth} ETH`
    : `${stakeBalanceFiatNumber?.toString()} ${currentCurrency.toUpperCase()}`;

  const currencyToggleValue = isEth
    ? `${fiatAmount} ${currentCurrency.toUpperCase()}`
    : `${unstakeAmount} ETH`;

  useEffect(() => {
    navigation.setOptions(getStakingNavbar(title, navigation, theme.colors));
  }, [navigation, theme.colors, title]);

  const handleEthInput = useCallback(
    (value: string) => {
      setUnstakeAmount(value);
      setUnstakeAmountBN(toWei(value, 'ether'));
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

      setUnstakeAmount(ethValue);
      setUnstakeAmountBN(toWei(ethValue, 'ether'));
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
    // TODO: Display the Review bottom sheet: STAKE-841
  }, []);

  const percentageOptions = [
    { value: 0.25, label: '25%' },
    { value: 0.5, label: '50%' },
    { value: 0.75, label: '75%' },
    { value: 1, label: 'Max' },
  ];

  const handleAmountPress = useCallback(
    ({ value }: { value: number }) => {
      const stakeBalanceBN = new BN(stakeBalance);
      if (!stakeBalanceBN) return;
      const percentage = value * 100;
      const amountPercentage = stakeBalanceBN
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
      setUnstakeAmount(newEthAmount);
      setUnstakeAmountBN(amountPercentage);

      const newFiatAmount = weiToFiatNumber(
        toWei(newEthAmount.toString(), 'ether'),
        conversionRate,
        2,
      ).toString();
      setFiatAmount(newFiatAmount);
    },
    [conversionRate, stakeBalance],
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
              {strings('stake.staked_balance')}
              {': '}
              {stakedBalanceText}
            </Text>
          )}
        </View>
        <View style={styles.amountRow}>
          <Text
            color={isNonZeroAmount ? TextColor.Default : TextColor.Muted}
            variant={TextVariant.DisplayMD}
          >
            {isEth ? unstakeAmount : fiatAmount}
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

      <QuickAmounts
        amounts={percentageOptions}
        onAmountPress={handleAmountPress}
      />
      <Keypad
        value={isEth ? unstakeAmount : fiatAmount}
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

export default UnstakeInputView;
