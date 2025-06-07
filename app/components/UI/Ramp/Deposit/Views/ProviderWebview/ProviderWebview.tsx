import React, { useEffect } from 'react';
import Text from '../../../../../../component-library/components/Texts/Text';
import StyledButton from '../../../../StyledButton';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import Row from '../../../Aggregator/components/Row';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import { useStyles } from '../../../../../hooks/useStyles';
import { useNavigation } from '@react-navigation/native';
import { getDepositNavbarOptions } from '../../../../Navbar';
import styleSheet from './ProviderWebview.styles';
import { BuyQuote } from '@consensys/native-ramps-sdk';

export interface ProviderWebviewParams {
  quote: BuyQuote;
}

export const createProviderWebviewNavDetails =
  createNavigationDetails<ProviderWebviewParams>(
    Routes.DEPOSIT.PROVIDER_WEBVIEW,
  );

const ProviderWebview = () => {
  const navigation = useNavigation();
  const { quote } = useParams<ProviderWebviewParams>();

  const [{ data: userDetailsResponse, error, isFetching: loading }] =
    useDepositSdkMethod('getUserDetails');

  const { theme, styles } = useStyles(styleSheet, {});

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(navigation, { title: 'Provider Webview' }, theme),
    );
  }, [navigation, theme]);

  const getKycText = () => {
    if (loading) return 'Loading KYC status...';
    if (error) return `Error: ${error}`;
    if (!userDetailsResponse) return 'No KYC data available';

    const status = userDetailsResponse?.kyc?.l1?.status;
    const type = userDetailsResponse?.kyc?.l1?.type;
    return `The user KYC is ${status || 'unknown'} for the type ${
      type || 'unknown'
    }`;
  };

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content>
          <Text style={styles.description}>{getKycText()}</Text>
          <Text style={styles.description}>Quote: {JSON.stringify(quote)}</Text>
        </ScreenLayout.Content>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <Row>
            <StyledButton type="confirm" accessibilityRole="button" accessible>
              Continue
            </StyledButton>
          </Row>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default ProviderWebview;
