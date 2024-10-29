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
import useUnstakingInputHandlers from '../../hooks/useUnstakingInput';

const UnstakeInputView = () => {
  const title = strings('stake.unstake_eth');
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});

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
  }, [amountWei, fiatAmount, navigation]);

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
        handleCurrencySwitch={handleCurrencySwitch}
        currencyToggleValue={currencyToggleValue}
      />
      <UnstakeInputViewBanner style={styles.unstakeBanner} />
      <QuickAmounts
        amounts={percentageOptions}
        onAmountPress={handleAmountPress}
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
