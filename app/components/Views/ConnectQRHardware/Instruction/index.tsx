/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import {
  KEYSTONE_LEARN_MORE,
  KEYSTONE_SUPPORT,
  KEYSTONE_SUPPORT_VIDEO,
} from '../../../../constants/urls';
import {
  fontStyles,
  colors as importedColors,
} from '../../../../styles/common';
import { useTheme } from '../../../../util/theme';
import StyledButton from '../../../UI/StyledButton';

interface IConnectQRInstructionProps {
  navigation: any;
  onConnect: () => void;
  renderAlert: () => Element;
}

const connectQRHardwareImg = require('images/connect-qr-hardware.png'); // eslint-disable-line import/no-commonjs

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
    },
    container: {
      flexDirection: 'column',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    scrollWrapper: {
      width: '100%',
    },
    title: {
      width: '100%',
      marginTop: 40,
      fontSize: 24,
      marginBottom: 20,
      ...fontStyles.normal,
      color: colors.text.alternative,
    },
    textContainer: {
      width: '100%',
      marginTop: 20,
    },
    text: {
      fontSize: 14,
      marginBottom: 24,
      ...fontStyles.normal,
      color: colors.text.alternative,
    },
    link: {
      color: colors.primary.default,
      ...fontStyles.bold,
    },
    bottom: {
      alignItems: 'center',
      height: 80,
      justifyContent: 'space-between',
    },
    button: {
      padding: 5,
      paddingHorizontal: '30%',
    },
    buttonText: {
      color: importedColors.white,
      ...fontStyles.normal,
    },
    image: {
      width: 300,
      height: 120,
      marginTop: 40,
      marginBottom: 40,
    },
    keystone: {
      height: 48,
      fontSize: 24,
    },
    buttonGroup: {
      display: 'flex',
      flexDirection: 'row',
    },
    linkMarginRight: {
      marginRight: 16,
    },
  });

const ConnectQRInstruction = (props: IConnectQRInstructionProps) => {
  const { onConnect, renderAlert, navigation } = props;
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const navigateToVideo = () => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: KEYSTONE_SUPPORT_VIDEO,
        title: strings('connect_qr_hardware.description2'),
      },
    });
  };
  const navigateToLearnMore = () => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: KEYSTONE_LEARN_MORE,
        title: strings('connect_qr_hardware.keystone'),
      },
    });
  };
  const navigateToTutorial = () => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: KEYSTONE_SUPPORT,
        title: strings('connect_qr_hardware.description4'),
      },
    });
  };
  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={styles.container}
        style={styles.scrollWrapper}
      >
        <Text style={styles.title}>{strings('connect_qr_hardware.title')}</Text>
        {renderAlert()}
        <View style={styles.textContainer}>
          <Text style={styles.text}>
            {strings('connect_qr_hardware.description1')}
          </Text>
          <Text style={[styles.text, styles.link]} onPress={navigateToVideo}>
            {strings('connect_qr_hardware.description2')}
          </Text>
          <Text style={styles.text}>
            {strings('connect_qr_hardware.description3')}
          </Text>
          <Text style={styles.keystone}>
            {strings('connect_qr_hardware.keystone')}
          </Text>
          <View style={styles.buttonGroup}>
            <Text
              style={[styles.text, styles.link, styles.linkMarginRight]}
              onPress={navigateToLearnMore}
            >
              {strings('connect_qr_hardware.learnMore')}
            </Text>
            <Text
              style={[styles.text, styles.link]}
              onPress={navigateToTutorial}
            >
              {strings('connect_qr_hardware.tutorial')}
            </Text>
          </View>
          <Text style={styles.text}>
            {strings('connect_qr_hardware.description5')}
          </Text>
          <Text style={styles.text}>
            {strings('connect_qr_hardware.description6')}
          </Text>
        </View>
        <Image
          style={styles.image}
          source={connectQRHardwareImg}
          resizeMode={'contain'}
        />
      </ScrollView>
      <View style={styles.bottom}>
        <StyledButton
          type={'confirm'}
          onPress={onConnect}
          style={styles.button}
        >
          {strings('connect_qr_hardware.button_continue')}
        </StyledButton>
      </View>
    </View>
  );
};

export default ConnectQRInstruction;
