import React, { useEffect, useState } from 'react';
import { WebView } from '@metamask/react-native-webview';
import { useNavigation } from '@react-navigation/native';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { strings } from '../../../../../../../locales/i18n';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { useStyles } from '../../../../../../component-library/hooks';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import { createKycProcessingNavDetails } from '../KycProcessing/KycProcessing';
import ErrorView from '../../../Aggregator/components/ErrorView';
import useUserDetailsPolling, {
  KycStatus,
} from '../../hooks/useUserDetailsPolling';
import styleSheet from './KycWebview.styles';

export interface KycWebviewParams {
  quote: BuyQuote;
  kycUrl?: string;
}

export const createKycWebviewNavDetails =
  createNavigationDetails<KycWebviewParams>(Routes.DEPOSIT.KYC_WEBVIEW);

const KycWebview = () => {
  const [error, setError] = useState('');
  const [key, setKey] = useState(0);
  const navigation = useNavigation();
  const params = useParams<KycWebviewParams>();
  const { quote, kycUrl } = params;
  const { theme } = useStyles(styleSheet, {});

  const { userDetails, error: pollingError } = useUserDetailsPolling(
    5000,
    true,
    0,
  );

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.kyc_webview.title') },
        theme,
      ),
    );
  }, [navigation, theme]);

  useEffect(() => {
    const kycStatus = userDetails?.kyc?.l1?.status;
    const kycType = userDetails?.kyc?.l1?.type;

    if (
      kycStatus &&
      kycStatus !== KycStatus.NOT_SUBMITTED &&
      kycType !== null &&
      kycType !== 'SIMPLE'
    ) {
      navigation.navigate(...createKycProcessingNavDetails({ quote }));
    }
  }, [
    userDetails?.kyc?.l1?.status,
    userDetails?.kyc?.l1?.type,
    navigation,
    quote,
  ]);

  if (pollingError) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView
            description={`Unable to check KYC status: ${pollingError}`}
            ctaOnPress={() => {
              setKey((prevKey) => prevKey + 1);
              setError('');
            }}
            location="Provider Webview"
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView
            description={error}
            ctaOnPress={() => {
              setKey((prevKey) => prevKey + 1);
              setError('');
            }}
            location="Provider Webview"
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (kycUrl) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <WebView
            key={key}
            source={{ uri: kycUrl }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              if (nativeEvent.url === kycUrl) {
                const webviewHttpError = strings(
                  'deposit.kyc_webview.webview_received_error',
                  { code: nativeEvent.statusCode },
                );
                setError(webviewHttpError);
              }
            }}
            allowsInlineMediaPlayback
            enableApplePay
            mediaPlaybackRequiresUserAction={false}
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  return null;
};

export default KycWebview;
