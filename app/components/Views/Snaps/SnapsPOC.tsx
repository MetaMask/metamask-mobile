import React, { Fragment, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { WebView } from 'react-native-webview';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import StyledButton from '../../UI/StyledButton';
import { useTheme, mockTheme } from '../../../util/theme';

// Snaps
import {
  wrapSourceCodeInIframe,
  generateBasicHTMLWithIframes,
  wrapScriptInHTML,
  wrapCodeInScriptTags,
  generateSnapIframeId,
} from './utils';
import { snapMock } from './SnapsMock';

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      width: '100%',
      paddingTop: 50,
      paddingHorizontal: 32,
      alignItems: 'center',
    },
    navbarRightButton: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      height: 48,
      width: 48,
      flex: 1,
    },
    closeIcon: {
      fontSize: 28,
      color: colors.text.default,
    },
    // eslint-disable-next-line react-native/no-color-literals
    webViewContainer: {
      margin: 25,
      width: 300,
      height: 500,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'thistle',
    },
    webView: {
      width: 300,
      height: 500,
    },
    actionButtonWrapper: {
      width: '100%',
      paddingBottom: 20,
    },
    actionButton: {
      marginVertical: 10,
    },
  });

const SnapsPOC: React.FC = () => {
  const [iframes, setIframes] = useState<string[]>([]);
  const [source, setSource] = useState<string>(
    generateBasicHTMLWithIframes(iframes),
  );
  const navigation = useNavigation();
  const { colors } = useTheme();
  const webviewRef = useRef() as any;
  const styles = createStyles(colors);

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        '',
        navigation,
        false,
        mockTheme.colors,
        undefined,
      ),
    );
  }, [navigation]);

  const runFirst = `
    const sendDataToReactNativeApp = async (response) => {
      window.ReactNativeWebView.postMessage(response);
    };
  `;

  const addNewIframe = () => {
    const snapMockScript = wrapCodeInScriptTags(snapMock.sourceCode);
    const newSource = wrapScriptInHTML(snapMockScript);
    const newIframe = wrapSourceCodeInIframe(
      newSource,
      generateSnapIframeId(snapMock.id.toString()),
    );
    const newIframesArray = [...iframes, newIframe];
    setSource(generateBasicHTMLWithIframes(newIframesArray));
    setIframes(newIframesArray);
  };

  const onMessage = (data: any) => {
    // eslint-disable-next-line no-console
    console.log(data.nativeEvent);
  };

  const sendDataToWebView = () => {
    webviewRef.current.postMessage(
      JSON.stringify({
        method: 'execute_snap',
        snapId: 'snap-1',
        args: { origin: 'origin', request: { method: 'hello' } },
      }),
    );
    webviewRef.current.postMessage(
      JSON.stringify({
        method: 'execute_snap',
        snapId: 'snap-2',
        args: { origin: 'origin', request: { method: 'hello' } },
      }),
    );
    // webviewRef.current.postMessage(
    //   JSON.stringify({
    //     method: 'start_snap',
    //     snapId: 'snap-3',
    //     sourceCode:
    //       'https://raw.githubusercontent.com/MetaMask/metamask-mobile/snaps/exec-env/snap_bundles/helloWorld_snap.js',
    //   }),
    // );
  };

  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const baseHTML = require('./content/base.html');

  return (
    <Fragment>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={navigation.goBack}
            style={styles.navbarRightButton}
          >
            <MaterialIcon name="close" size={15} style={styles.closeIcon} />
          </TouchableOpacity>
        </View>
        <View style={styles.webViewContainer}>
          <WebView
            originWhitelist={['*']}
            ref={webviewRef}
            style={styles.webView}
            source={baseHTML}
            javaScriptEnabledAndroid
            injectedJavaScript={runFirst}
            mixedContentMode="compatibility"
            onMessage={onMessage}
            applicationNameForUserAgent={
              'WebView Snap Execution Environment MetaMask Mobile'
            }
          />
        </View>
      </View>
      <View style={styles.actionButtonWrapper}>
        <StyledButton
          type="normal"
          containerStyle={styles.actionButton}
          onPress={addNewIframe}
        >
          Add new iframe
        </StyledButton>
        <StyledButton
          type="orange"
          containerStyle={styles.actionButton}
          onPress={sendDataToWebView}
        >
          Execute code
        </StyledButton>
      </View>
    </Fragment>
  );
};

export default SnapsPOC;
