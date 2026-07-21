/**
 * MoonpayFrame — thin render shell that embeds a MoonPay Check, Auth, or
 * Challenge frame in a React Native WebView.
 *
 * All message-bridging logic, origin validation, and reply mechanics live in
 * `./useMoonpayFrame`.
 */

import React from 'react';
import { StyleProp, ViewStyle, View } from 'react-native';
import { WebView } from '@metamask/react-native-webview';
import useMoonpayFrame, {
  MOONPAY_FRAMES_ORIGIN,
  POSTMESSAGE_BRIDGE,
} from './useMoonpayFrame';

export type { MoonpayFrameMessage } from './useMoonpayFrame';

export interface MoonpayFrameProps {
  url: string;
  onMessage: (msg: import('./useMoonpayFrame').MoonpayFrameMessage) => void;
  onError?: (err: string) => void;
  onRawMessage?: (raw: string) => void;
  onLoadStart?: (url: string) => void;
  onLoadEnd?: (url: string) => void;
  invisible?: boolean;
  clearStorageOnLoad?: boolean;
  style?: StyleProp<ViewStyle>;
}

const CLEAR_STORAGE_SCRIPT = `
try { localStorage.clear(); } catch(e) {}
try { sessionStorage.clear(); } catch(e) {}
try { indexedDB.databases().then(function(dbs) { dbs.forEach(function(db) { indexedDB.deleteDatabase(db.name); }); }); } catch(e) {}
true;
`;

const MoonpayFrame: React.FC<MoonpayFrameProps> = ({
  url,
  onMessage,
  onError,
  onRawMessage,
  onLoadStart,
  onLoadEnd,
  invisible,
  clearStorageOnLoad,
  style,
}) => {
  const { webViewRef, containerStyle, handleMessage } = useMoonpayFrame({
    onMessage,
    onError,
    onRawMessage,
    invisible,
    style,
  });

  return (
    <View style={containerStyle}>
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        injectedJavaScriptBeforeContentLoaded={
          clearStorageOnLoad
            ? CLEAR_STORAGE_SCRIPT + POSTMESSAGE_BRIDGE
            : POSTMESSAGE_BRIDGE
        }
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled={!clearStorageOnLoad}
        sharedCookiesEnabled={!clearStorageOnLoad}
        originWhitelist={[MOONPAY_FRAMES_ORIGIN, 'https://*.moonpay.com']}
        onLoadStart={(e) => onLoadStart?.(e.nativeEvent.url)}
        onLoadEnd={(e) => onLoadEnd?.(e.nativeEvent.url)}
        onError={(e) =>
          onError?.(`WebView error: ${e.nativeEvent.description}`)
        }
        onHttpError={(e) =>
          onError?.(`HTTP ${e.nativeEvent.statusCode} loading ${url}`)
        }
      />
    </View>
  );
};

export default MoonpayFrame;
