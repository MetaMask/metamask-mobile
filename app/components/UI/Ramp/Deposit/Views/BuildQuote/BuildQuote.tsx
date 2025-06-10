import React, { useCallback, useEffect, useState } from 'react';
import Text from '../../../../../../component-library/components/Texts/Text';
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
import { View } from 'react-native';
import DepositTextField from '../../components/DepositTextField';

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

  const handleAmountChange = (text: string) => {
    // Only allow numbers and decimal point
    if (/^\d*\.?\d*$/.test(text)) {
      setAmount(text);
    }
  };

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content>
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <Text style={{ textAlign: 'center', marginTop: 40 }}>
            Build Quote Page Placeholder
          </Text>

          <View style={styles.inputContainer}>
            <DepositTextField
              label="Enter amount"
              value={amount}
              onChangeText={handleAmountChange}
            />
          </View>
          <View style={styles.detailsContainer}>
            <Text style={styles.sectionTitle}>Quote Details</Text>

            <View style={styles.detailRow}>
              <Text>Payment Method:</Text>
              <Text>{paymentMethod.replace('_', ' ').toUpperCase()}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text>Crypto Currency:</Text>
              <Text>{cryptoCurrency}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text>Fiat Currency:</Text>
              <Text>{fiatCurrency}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text>Network:</Text>
              <Text>{network.charAt(0).toUpperCase() + network.slice(1)}</Text>
            </View>
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
