import React, { useRef } from 'react';
import WebView from '@metamask/react-native-webview';
import {
  ShouldStartLoadRequest,
  WebViewErrorEvent,
  WebViewNavigationEvent,
} from '@metamask/react-native-webview/lib/WebViewTypes';
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
  const webStates = useRef<
    Record<string, { requested: boolean; started: boolean; ended: boolean }>
  >({});

  LOGBROWSER('RERENDER');

  const onLoadStart = (e: WebViewNavigationEvent) => {
    const { loading, url } = e.nativeEvent;
    webStates.current[url] = { ...webStates.current[url], started: true };
    LOGBROWSER('LOAD START', e.nativeEvent);
    if (loading) {
    }
  };

  const onLoadEnd = (e: WebViewNavigationEvent | WebViewErrorEvent) => {
    const { url, loading } = e.nativeEvent;
    LOGBROWSER('LOAD END', e.nativeEvent);
    // Directly update url in text input
    webStates.current[url] = { ...webStates.current[url], ended: true };
    const { requested, started, ended } = webStates.current[url];
    // TODO: Handle iOS case where uniswap.com/something needs to redirect to not-found
    if (started && ended) {
      delete webStates.current[url];
      textInputRef.current?.setNativeProps({ text: url });
    }
  };

  const onShouldStartLoadWithRequest = (e: ShouldStartLoadRequest) => {
    const { url } = e;
    webStates.current[url] = { ...webStates.current[url], requested: true };
    LOGBROWSER('SHOULD START LOAD WITH REQUEST', e);

    return true;
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
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        source={{ uri: 'https://www.google.com' }}
        onLoadStart={onLoadStart}
        onLoadEnd={onLoadEnd}
      />
    </View>
  );
};

export default BrowserTab;
