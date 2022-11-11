import React, { Fragment, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { WebView } from 'react-native-webview';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import StyledButton from '../../UI/StyledButton';
import { useTheme, mockTheme } from '../../../util/theme';
import {
  basicHTML,
  mockIframe,
  jsCode,
  mockScript,
  safeExecEnv,
} from './basicHTML';

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
  const [source, setSource] = useState<string>(basicHTML(iframes));
  const navigation = useNavigation();
  const { colors } = useTheme();
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

  const addNewIframe = () => {
    const newIframesArray = [...iframes, mockIframe];
    setSource(basicHTML(newIframesArray));
    setIframes(newIframesArray);
  };

  const runFirst = `
    const sendDataToReactNativeApp = async () => {
      window.ReactNativeWebView.postMessage('Data from WebView / Website');
    };
  `;

  const onMessage = (data: any) => {
    // eslint-disable-next-line no-console
    console.log(data.nativeEvent.data);
  };

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
            style={styles.webView}
            source={{ html: source }}
            injectedJavaScript={runFirst}
            javaScriptEnabledAndroid
            mixedContentMode="compatibility"
            onMessage={onMessage}
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
          onPress={() => null}
        >
          Execute code
        </StyledButton>
      </View>
    </Fragment>
  );
};

export default SnapsPOC;
