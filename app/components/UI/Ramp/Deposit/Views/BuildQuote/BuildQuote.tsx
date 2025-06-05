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

const BuildQuote = () => {
  const navigation = useNavigation();
  const { theme } = useStyles(styleSheet, {});

  const [paymentMethod] = useState<string>('credit_debit_card');
  const [cryptoCurrency] = useState<string>('USDC');
  const [fiatCurrency] = useState<string>('USD');
  const [network] = useState<string>('ethereum');
  const [amount] = useState<string>('100');
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
          navigation.navigate(...createProviderWebviewNavDetails());
        } else {
          navigation.navigate(...createBasicInfoNavDetails());
        }
      } else {
        navigation.navigate(...createEnterEmailNavDetails());
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

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content>
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <Text style={{ textAlign: 'center', marginTop: 40 }}>
            Build Quote Page Placeholder
          </Text>
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
