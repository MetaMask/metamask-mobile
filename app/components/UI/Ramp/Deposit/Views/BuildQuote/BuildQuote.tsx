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
  USDT_TOKEN,
  SUPPORTED_DEPOSIT_TOKENS,
  DepositCryptoCurrency,
  DepositPaymentMethod,
  USD_CURRENCY,
  DepositFiatCurrency,
  EUR_CURRENCY,
} from '../../constants';
import AccountSelector from '../../components/AccountSelector';
import I18n, { strings } from '../../../../../../../locales/i18n';
import useDepositTokenExchange from '../../hooks/useDepositTokenExchange';
import { getIntlNumberFormatter } from '../../../../../../util/intl';
import {
  getTransakCryptoCurrencyId,
  getTransakFiatCurrencyId,
  getTransakChainId,
  getTransakPaymentMethodId,
} from '../../utils';

function formatAmount(
  amount: number,
  options: Intl.NumberFormatOptions,
): string {
  return getIntlNumberFormatter(I18n.locale, options).format(amount);
}

const BuildQuote = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});

  const [paymentMethod] = useState<DepositPaymentMethod>(
    DEBIT_CREDIT_PAYMENT_METHOD,
  );
  const [cryptoCurrency, setCryptoCurrency] =
    useState<DepositCryptoCurrency>(USDC_TOKEN);
  const [fiatCurrency, setFiatCurrency] =
    useState<DepositFiatCurrency>(USD_CURRENCY);
  const [amount, setAmount] = useState<string>('0');
  const [amountAsNumber, setAmountAsNumber] = useState<number>(0);
  const { isAuthenticated } = useDepositSDK();
  const [error, setError] = useState<string | null>();

  const [{ error: quoteFetchError }, getQuote] = useDepositSdkMethod(
    { method: 'getBuyQuote', onMount: false },
    fiatCurrency.id,
    cryptoCurrency.assetId,
    cryptoCurrency.chainId,
    paymentMethod.id,
    amount,
  );

  const [{ error: kycFormsFetchError }, fetchKycForms] = useDepositSdkMethod({
    method: 'getKYCForms',
    onMount: false,
  });

  const { tokenAmount } = useDepositTokenExchange({
    fiatCurrency,
    fiatAmount: amount,
    token: cryptoCurrency,
    tokens: SUPPORTED_DEPOSIT_TOKENS,
  });

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(navigation, { title: 'Build Quote' }, theme),
    );
  }, [navigation, theme]);

  const handleOnPressContinue = useCallback(async () => {
    try {
      console.log('handleOnPressContinue', {
        fiatCurrency: fiatCurrency.id,
        cryptoCurrency: cryptoCurrency.symbol,
        paymentMethod: paymentMethod.name,
        amount: amountAsNumber,
      });

      const quote = await getQuote(
        getTransakFiatCurrencyId(fiatCurrency),
        getTransakCryptoCurrencyId(cryptoCurrency),
        getTransakChainId(cryptoCurrency.chainId),
        getTransakPaymentMethodId(paymentMethod),
        amount,
      );

      if (quote) {
        const forms = await fetchKycForms(quote);
        if (kycFormsFetchError) {
          setError(strings('deposit.buildQuote.kycFormsFetchError'));
        } else {
          const { forms: requiredForms } = forms || {};
          if (isAuthenticated) {
            if (requiredForms?.length === 0) {
              navigation.navigate(
                ...createProviderWebviewNavDetails({ quote }),
              );
            } else {
              navigation.navigate(...createBasicInfoNavDetails({ quote }));
            }
          } else {
            navigation.navigate(...createEnterEmailNavDetails({ quote }));
          }
        }
      } else if (quoteFetchError) {
        // TODO: Display quote fetch error to the user?
        setError(strings('deposit.buildQuote.quoteFetchError'));
      }
    } catch (_) {
      setError(strings('deposit.buildQuote.unexpectedError'));
    }
  }, [
    amount,
    cryptoCurrency,
    fetchKycForms,
    fiatCurrency,
    getQuote,
    isAuthenticated,
    navigation,
    paymentMethod,
    quoteFetchError,
    kycFormsFetchError,
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
  }, []);

  const handleFiatPress = useCallback(() => {
    // TODO: Implement fiat selection logic
    // this is a temp UX to switch between USD and EUR
    setFiatCurrency((current) =>
      current.id === 'USD' ? EUR_CURRENCY : USD_CURRENCY,
    );
  }, []);

  const handleCryptoPress = useCallback(() => {
    // TODO: Implement crypto selection logic
    // this is a temp UX to switch between USDC and USDT
    setCryptoCurrency((current) =>
      current.symbol === 'USDC' ? USDT_TOKEN : USDC_TOKEN,
    );
  }, []);

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
              {formatAmount(amountAsNumber, {
                style: 'currency',
                currency: fiatCurrency.id,
                currencyDisplay: 'narrowSymbol',
              })}
            </Text>

            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              style={styles.convertedAmount}
            >
              {Number(tokenAmount) === 0
                ? Number(tokenAmount).toFixed(2)
                : tokenAmount}{' '}
              {cryptoCurrency.symbol}
            </Text>

            <TouchableOpacity onPress={handleCryptoPress}>
              <View style={styles.cryptoPill}>
                <Image
                  source={{ uri: cryptoCurrency.logo }}
                  style={styles.tokenLogo}
                />
                <Text variant={TextVariant.HeadingLG} style={styles.cryptoText}>
                  {cryptoCurrency.symbol}
                </Text>
              </View>
            </TouchableOpacity>
            {error && (
              <View style={styles.errorContainer}>
                <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
                  {error}
                </Text>
              </View>
            )}
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
