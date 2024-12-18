import WebView from '@metamask/react-native-webview';
import {
  WebViewErrorEvent,
  WebViewNavigationEvent,
} from '@metamask/react-native-webview/lib/WebViewTypes';
import { useRef } from 'react';
import {
  NativeSyntheticEvent,
  TextInput,
  TextInputSubmitEditingEventData,
  View,
  TouchableOpacity,
} from 'react-native';
import { processUrlForBrowser } from './utils';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';

const LOGBROWSER = (...args: any[]) => {
  console.log(`BROWSER TAB:`, ...args);
};

const BrowserTab = () => {
  const webViewRef = useRef<WebView>(null);
  const textInputRef = useRef<TextInput>(null);

  const onLoadEnd = (e: WebViewNavigationEvent | WebViewErrorEvent) => {
    const { url } = e.nativeEvent;
    // Directly update url in text input
    textInputRef.current?.setNativeProps({ text: url });
  };

  const onSubmitEditing = (
    e: NativeSyntheticEvent<TextInputSubmitEditingEventData>,
  ) => {
    // Stop loading webview
    webViewRef.current?.stopLoading();
    const value = e.nativeEvent.text;
    // Format url for browser to be navigatable by webview
    const url = processUrlForBrowser(value);
    LOGBROWSER(url);
    // Directly update url in webview
    webViewRef.current?.injectJavaScript(`
      window.location.href = '${url}';
      true;  // Required for iOS
    `);
  };

  const onBack = () => {
    // Stop loading webview
    webViewRef.current?.stopLoading();
    // Go back to previous page
    webViewRef.current?.goBack();
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity
          style={{
            width: 50,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
          }}
          onPress={onBack}
        >
          <Icon name={IconName.ArrowLeft} size={IconSize.Md} />
        </TouchableOpacity>
        <TextInput
          ref={textInputRef}
          style={{
            flex: 1,
            paddingHorizontal: 16,
            height: 50,
            borderWidth: 1,
          }}
          onSubmitEditing={onSubmitEditing}
          autoCorrect={false}
          autoCapitalize="none"
          placeholder="Enter URL"
        />
      </View>
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://www.google.com' }}
        onLoadEnd={onLoadEnd}
      />
    </View>
  );
};

export default BrowserTab;
