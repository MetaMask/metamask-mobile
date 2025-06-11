import React, { useCallback, useEffect, useState } from 'react';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import StyledButton from '../../../../StyledButton';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { useNavigation } from '@react-navigation/native';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './BuildQuote.styles';
import { useDepositSDK } from '../../sdk';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import { createProviderWebviewNavDetails } from '../ProviderWebview/ProviderWebview';
import { createBasicInfoNavDetails } from '../BasicInfo/BasicInfo';
import { createEnterEmailNavDetails } from '../EnterEmail/EnterEmail';
import { View, TouchableOpacity, Image } from 'react-native';
import Keypad from '../../../../../Base/Keypad';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import {
  DEBIT_CREDIT_PAYMENT_METHOD,
  USDC_TOKEN,
  DepositCryptoCurrency,
  DepositPaymentMethod,
  USD_CURRENCY,
  DepositFiatCurrency,
} from '../../constants';
import AccountSelector from '../../components/AccountSelector';
import { strings } from '../../../../../../../locales/i18n';
import { formatAmount } from '../../../Aggregator/utils';
import { useSelector } from 'react-redux';
import { selectMultichainAssetsRates } from '../../../../../../selectors/multichain';
import {
  selectContractExchangeRatesByChainId,
  selectTokenMarketData,
} from '../../../../../../selectors/tokenRatesController';

const BuildQuote = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});

  const [paymentMethod] = useState<DepositPaymentMethod>(
    DEBIT_CREDIT_PAYMENT_METHOD,
  );
  const [cryptoCurrency] = useState<DepositCryptoCurrency>(USDC_TOKEN);
  const [fiatCurrency] = useState<DepositFiatCurrency>(USD_CURRENCY);
  const [network] = useState<string>('ethereum');
  const [amount, setAmount] = useState<string>('0');
  const [amountAsNumber, setAmountAsNumber] = useState<number>('0');

  const { isAuthenticated } = useDepositSDK();

  const [, getQuote] = useDepositSdkMethod(
    { method: 'getBuyQuote', onMount: false },
    fiatCurrency.id,
    cryptoCurrency.id,
    cryptoCurrency.chainId,
    paymentMethod.id,
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
      fiatCurrency.id,
      cryptoCurrency.id,
      cryptoCurrency.chainId,
      paymentMethod.id,
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
      valueAsNumber,
    }: {
      value: string;
      valueAsNumber: number;
      pressedKey: string;
    }) => {
      setAmount(value || '0');
      setAmountAsNumber(valueAsNumber || 0);
    },
    [],
  );

  const handlePaymentMethodPress = useCallback(() => {
    // TODO: Implement payment method selection logic
    console.log('Payment method selection pressed');
  }, []);

  const handleFiatPress = useCallback(() => {
    // TODO: Implement fiat selection logic
    console.log('Fiat selection pressed');
  }, []);

  const handleCryptoPress = useCallback(() => {
    // TODO: Implement crypto selection logic
    console.log('Crypto selection pressed');
  }, []);

  const usdcAmount = parseFloat(amount || '0').toFixed(2);
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
  const contractExchangeRates = useSelector((state: RootState) =>
    selectContractExchangeRatesByChainId(state, '0x1' as Hex),
  );
  console.log('Multichain Assets Rates:', multichainAssetsRates);
  console.log('Token Market Data:', contractExchangeRates);
  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content style={styles.content}>
          <View style={styles.selectionRow}>
            <AccountSelector />
            <TouchableOpacity
              style={styles.fiatSelector}
              onPress={handleFiatPress}
            >
              <View>
                <Text variant={TextVariant.BodyMD}>{fiatCurrency.id}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.centerGroup}>
            <Text
              variant={TextVariant.HeadingLG}
              style={styles.mainAmount}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {fiatCurrency.symbol}
              {formatAmount(amountAsNumber)}
            </Text>

            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              style={styles.convertedAmount}
            >
              {usdcAmount} {cryptoCurrency.symbol}
            </Text>

            <TouchableOpacity onPress={handleCryptoPress}>
              <View style={styles.cryptoPill}>
                <Image
                  source={{ uri: USDC_TOKEN.logo }}
                  style={styles.tokenLogo}
                />
                <Text variant={TextVariant.HeadingLG} style={styles.cryptoText}>
                  {USDC_TOKEN.symbol}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.paymentMethodBox}
            onPress={handlePaymentMethodPress}
          >
            <View style={styles.paymentMethodContent}>
              <View>
                <Text variant={TextVariant.BodyMD}>
                  {strings('deposit.buildQuote.payWith')}
                </Text>

                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
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
          <Keypad
            style={styles.keypad}
            value={amount}
            onChange={handleKeypadChange}
            currency={fiatCurrency.symbol}
            decimals={0}
            deleteIcon={<Icon name={IconName.Arrow2Left} size={IconSize.Lg} />}
          />
        </ScreenLayout.Content>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <StyledButton
            type="confirm"
            onPress={handleOnPressContinue}
            accessibilityRole="button"
            accessible
          >
            Continue
          </StyledButton>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default BuildQuote;
