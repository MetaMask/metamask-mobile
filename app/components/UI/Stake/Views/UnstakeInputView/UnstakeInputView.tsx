import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
import { BN } from 'ethereumjs-util';
import UnstakeInputViewBanner from './UnstakeBanner';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import { renderFromWei, weiToFiatNumber } from '../../../../../util/number';
import Keypad from '../../../../Base/Keypad';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakingNavbar } from '../../../Navbar';
import ScreenLayout from '../../../Ramp/components/ScreenLayout';
import QuickAmounts from '../../components/QuickAmounts';
import { View } from 'react-native';
import useStakingInputHandlers from '../../hooks/useStakingInput';
import styleSheet from './UnstakeInputView.styles';
import InputDisplay from '../../components/InputDisplay';

const UnstakeInputView = () => {
  const title = strings('stake.unstake_eth');
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});

  const stakeBalance = '4599964000000000000'; //TODO: Replace with actual balance - STAKE-806

  const {
    isEth,
    currentCurrency,
    isNonZeroAmount,
    amount,
    fiatAmount,
    isOverMaximum,
    handleCurrencySwitch,
    currencyToggleValue,
    percentageOptions,
    handleAmountPress,
    handleKeypadChange,
    conversionRate,
  } = useStakingInputHandlers(new BN(stakeBalance));

  const stakeBalanceInEth = renderFromWei(stakeBalance, 5);
  const stakeBalanceFiatNumber = weiToFiatNumber(stakeBalance, conversionRate);

  const stakedBalanceText = strings('stake.staked_balance');
  const stakedBalanceValue = isEth
    ? `${stakeBalanceInEth} ETH`
    : `${stakeBalanceFiatNumber?.toString()} ${currentCurrency.toUpperCase()}`;

  const buttonLabel = !isNonZeroAmount
    ? strings('stake.enter_amount')
    : isOverMaximum
    ? strings('stake.not_enough_eth')
    : strings('stake.review');

  useEffect(() => {
    navigation.setOptions(getStakingNavbar(title, navigation, theme.colors));
  }, [navigation, theme.colors, title]);

  const handleUnstakePress = useCallback(() => {
    // TODO: Display the Review bottom sheet: STAKE-841
  }, []);

  return (
    <ScreenLayout style={styles.container}>
      <InputDisplay
        isOverMaximum={isOverMaximum}
        balanceText={stakedBalanceText}
        balanceValue={stakedBalanceValue}
        isNonZeroAmount={isNonZeroAmount}
        amount={amount}
        fiatAmount={fiatAmount}
        isEth={isEth}
        currentCurrency={currentCurrency}
        handleCurrencySwitch={handleCurrencySwitch}
        currencyToggleValue={currencyToggleValue}
      />
      <UnstakeInputViewBanner style={styles.unstakeBanner} />
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
