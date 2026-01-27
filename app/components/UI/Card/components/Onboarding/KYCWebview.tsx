import React, { useEffect, useCallback } from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useNavigation, StackActions } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { SafeAreaView } from 'react-native-safe-area-context';
import VeriffSdk from '@veriff/react-native-sdk';
import Logger from '../../../../../util/Logger';
import { ActivityIndicator } from 'react-native';

interface KYCWebviewProps {
  url: string;
}

const KYCWebview: React.FC = () => {
  const navigation = useNavigation();
  const { url } = useParams<KYCWebviewProps>();
  const tw = useTailwind();

  const launchVeriff = useCallback(async () => {
    const result = await VeriffSdk.launchVeriff({ sessionUrl: url });

    switch (result.status) {
      case VeriffSdk.statusDone:
        // End-user submitted the images and completed the flow
        navigation.dispatch(
          StackActions.replace(Routes.CARD.ONBOARDING.VERIFYING_VERIFF_KYC),
        );
        break;
      case VeriffSdk.statusCanceled:
        // End-user canceled the flow before completing
        navigation.goBack();
        break;
      case VeriffSdk.statusError:
        // The flow could not be completed due to an error
        Logger.error(
          new Error('Veriff verification failed'),
          `Veriff verification failed with error=${result.error}`,
        );
        navigation.goBack();
        break;
    }
  }, [url, navigation]);

  useEffect(() => {
    launchVeriff();
  }, [launchVeriff]);

  return (
    <SafeAreaView
      style={tw.style(
        'flex-1 bg-background-default items-center justify-center',
      )}
      edges={['bottom']}
    >
      <ActivityIndicator size="large" />
    </SafeAreaView>
  );
};

export default KYCWebview;
