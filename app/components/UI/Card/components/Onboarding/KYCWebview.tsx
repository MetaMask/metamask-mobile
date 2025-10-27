import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { WebView, WebViewNavigation } from '@metamask/react-native-webview';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useNavigation, StackActions } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';

interface KYCWebviewProps {
  url: string;
}

const KYCWebview: React.FC = () => {
  const navigation = useNavigation();
  const { url } = useParams<KYCWebviewProps>();
  const tw = useTailwind();

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    if (
      navState.url?.includes('www.veriff.com/get-verified?navigation=slim') ||
      navState.title?.includes(
        'Get Verified | Personal Data Protection Matters to Us - Veriff',
      )
    ) {
      navigation.dispatch(
        StackActions.replace(Routes.CARD.ONBOARDING.VALIDATING_KYC),
      );
    }
  };

  return (
    <WebView
      testID={'kyc-webview'}
      containerStyle={tw.style('flex-1')}
      allowsInlineMediaPlayback
      source={{ uri: url }}
      onNavigationStateChange={handleNavigationStateChange}
    />
  );
};

export default KYCWebview;
