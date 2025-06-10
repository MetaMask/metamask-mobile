import React, { useCallback, useEffect, useState } from 'react';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import StyledButton from '../../../../StyledButton';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import Row from '../../../Aggregator/components/Row';
import { useNavigation } from '@react-navigation/native';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './BuildQuote.styles';
import { useDepositSDK } from '../../sdk';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import { createProviderWebviewNavDetails } from '../ProviderWebview/ProviderWebview';
import { createBasicInfoNavDetails } from '../BasicInfo/BasicInfo';
import { createEnterEmailNavDetails } from '../EnterEmail/EnterEmail';
import { View, Image, TouchableOpacity } from 'react-native';
import Keypad from '../../../../../Base/Keypad';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { USDC_TOKEN, DEBIT_CREDIT_PAYMENT_METHOD } from '../../constants';

const BuildQuote = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});

  const [paymentMethod] = useState<string>('credit_debit_card');
  const [cryptoCurrency] = useState<string>('USDC');
  const [fiatCurrency] = useState<string>('USD');
  const [network] = useState<string>('ethereum');
  const [amount, setAmount] = useState<string>('100');
  const { isAuthenticated } = useDepositSDK();

  const [, getQuote] = useDepositSdkMethod(
    { method: 'getBuyQuote', onMount: false },
    fiatCurrency,
    cryptoCurrency,
    network,
    paymentMethod,
    amount,
  );

  const [, fetchKycForms] = useDepositSdkMethod({
    method: 'getKYCForms',
    onMount: false,
  });

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(navigation, { title: 'Build Quote' }, theme),
    );
  }, [navigation, theme]);

  const handleOnPressContinue = useCallback(async () => {
    const quote = await getQuote(
      fiatCurrency,
      cryptoCurrency,
      network,
      paymentMethod,
      amount,
    );

    if (quote) {
      const forms = await fetchKycForms(quote);
      const { forms: requiredForms } = forms || {};
      if (isAuthenticated) {
        if (requiredForms?.length === 0) {
          navigation.navigate(...createProviderWebviewNavDetails({ quote }));
        } else {
          navigation.navigate(...createBasicInfoNavDetails({ quote }));
        }
      } else {
        navigation.navigate(...createEnterEmailNavDetails({ quote }));
      }
    } else {
      // TODO: Handle error case where quote can not be generated
      console.error('Failed to fetch quote');
    }
  }, [
    amount,
    cryptoCurrency,
    fetchKycForms,
    fiatCurrency,
    getQuote,
    isAuthenticated,
    navigation,
    network,
    paymentMethod,
  ]);

  const handleKeypadChange = useCallback(
    ({
      value,
    }: {
      value: string;
      valueAsNumber: number;
      pressedKey: string;
    }) => {
      setAmount(value || '0');
    },
    [],
  );

  const handleAccountPress = useCallback(() => {
    // TODO: Implement account selection logic
    console.log('Account selection pressed');
  }, []);

  const handleFiatPress = useCallback(() => {
    // TODO: Implement fiat selection logic
    console.log('Fiat selection pressed');
  }, []);

  const handlePaymentMethodPress = useCallback(() => {
    // TODO: Implement payment method selection logic
    console.log('Payment method selection pressed');
  }, []);

  // Calculate USDC equivalent (mock calculation - replace with actual conversion logic)
  const usdcAmount = parseFloat(amount || '0').toFixed(2);

  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value || '0');
    return `$${numValue.toFixed(2)}`;
  };

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content style={styles.content}>
          {/* Account and Fiat Selection Row */}
          <View style={styles.selectionRow}>
            <TouchableOpacity
              style={styles.selectionBox}
              onPress={handleAccountPress}
            >
              <Text variant={TextVariant.BodyMD}>Account 1</Text>
              <Icon
                name={IconName.ArrowDown}
                size={IconSize.Sm}
                color={theme.colors.icon.alternative}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.selectionBox}
              onPress={handleFiatPress}
            >
              <Text variant={TextVariant.BodyMD}>USD</Text>
              <Icon
                name={IconName.ArrowDown}
                size={IconSize.Sm}
                color={theme.colors.icon.alternative}
              />
            </TouchableOpacity>
          </View>

          {/* Centered Amount Group */}
          <View style={styles.centerGroup}>
            {/* Amount Display */}
            <View style={styles.amountContainer}>
              <Text variant={TextVariant.HeadingLG} style={styles.mainAmount}>
                {formatCurrency(amount)}
              </Text>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Alternative}
                style={styles.convertedAmount}
              >
                {usdcAmount} USDC
              </Text>
            </View>

            {/* Crypto Pill */}
            <View style={styles.cryptoPill}>
              <Image
                source={{ uri: USDC_TOKEN.logo }}
                style={styles.tokenLogo}
              />
              <Text variant={TextVariant.BodyMD} style={styles.cryptoText}>
                {USDC_TOKEN.symbol}
              </Text>
            </View>
          </View>

          {/* Payment Method Box */}
          <TouchableOpacity
            style={styles.paymentMethodBox}
            onPress={handlePaymentMethodPress}
          >
            <View style={styles.paymentMethodContent}>
              <View>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  Pay with
                </Text>
                <Text variant={TextVariant.BodyMD}>
                  {DEBIT_CREDIT_PAYMENT_METHOD.name}
                </Text>
              </View>
              <Icon
                name={IconName.ArrowRight}
                size={IconSize.Md}
                color={theme.colors.icon.alternative}
              />
            </View>
          </TouchableOpacity>

          {/* Keypad */}
          <View style={styles.keypadContainer}>
            <Keypad
              style={styles.keypad}
              value={amount}
              onChange={handleKeypadChange}
              currency={fiatCurrency}
              decimals={2}
              deleteIcon={
                <Icon name={IconName.Arrow2Left} size={IconSize.Lg} />
              }
            />
          </View>
        </ScreenLayout.Content>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <Row>
            <StyledButton
              type="confirm"
              onPress={handleOnPressContinue}
              accessibilityRole="button"
              accessible
            >
              Continue
            </StyledButton>
          </Row>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default BuildQuote;
