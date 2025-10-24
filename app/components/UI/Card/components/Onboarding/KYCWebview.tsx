import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { WebView } from '@metamask/react-native-webview';
import { useParams } from '../../../../../util/navigation/navUtils';

interface KYCWebviewProps {
  url: string;
}

const KYCWebview: React.FC = () => {
  const { url } = useParams<KYCWebviewProps>();
  const tw = useTailwind();

  return (
    <WebView
      testID={'kyc-webview'}
      containerStyle={tw.style('flex-1')}
      source={{ uri: url }}
    />
  );
};

export default KYCWebview;
