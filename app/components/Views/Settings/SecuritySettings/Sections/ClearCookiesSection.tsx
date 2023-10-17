import CookieManager from '@react-native-cookies/cookies';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { CLEAR_COOKIES_SECTION } from '../../../../../constants/test-ids';
import { fontStyles } from '../../../../../styles/common';
import Device from '../../../../../util/device';
import Logger from '../../../../../util/Logger';
import { mockTheme, useAppThemeFromContext } from '../../../../../util/theme';
import ActionModal from '../../../../UI/ActionModal';
import StyledButton from '../../../../UI/StyledButton';

const createStyles = (colors: any) =>
  StyleSheet.create({
    setting: {
      marginTop: 50,
    },
    title: {
      ...fontStyles.normal,
      color: colors.text.default,
      fontSize: 20,
      lineHeight: 20,
      paddingTop: 4,
      marginTop: -4,
    },
    desc: {
      ...fontStyles.normal,
      color: colors.text.alternative,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 12,
    },
    confirm: {
      marginTop: 18,
    },
    modalView: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 20,
    },
    modalTitle: {
      ...fontStyles.bold,
      fontSize: 22,
      textAlign: 'center',
      marginBottom: 20,
      color: colors.text.default,
    },
    modalText: {
      ...fontStyles.normal,
      fontSize: 18,
      textAlign: 'center',
      color: colors.text.default,
    },
  });

const ClearCookiesSection = () => {
  const [cookiesModalVisible, setCookiesModalVisible] = useState(false);
  const [hasCookies, setHasCookies] = useState(false);
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);

  useEffect(() => {
    const run = async () => {
      if (Device.isAndroid()) {
        setHasCookies(true);
      }

      if (Device.isIos()) {
        const useWebKit = true;
        const cookies = await CookieManager.getAll(useWebKit);
        setHasCookies(Object.keys(cookies).length > 0);
      }
    };

    run();
  }, []);

  const toggleClearCookiesModal = () =>
    setCookiesModalVisible(!cookiesModalVisible);

  const clearCookies = async () => {
    const useWebKit = true;
    await CookieManager.clearAll(useWebKit);
    Logger.log('Browser cookies cleared');

    if (Device.isIos()) {
      const cookies = await CookieManager.getAll(useWebKit);
      setHasCookies(Object.keys(cookies).length > 0);
    }

    toggleClearCookiesModal();
  };

  return (
    <>
      <View style={styles.setting} testID={CLEAR_COOKIES_SECTION}>
        <Text style={styles.title}>
          {strings('app_settings.clear_browser_cookies_desc')}
        </Text>
        <Text style={styles.desc}>
          {strings('app_settings.clear_cookies_desc')}
        </Text>
        <StyledButton
          type="normal"
          onPress={toggleClearCookiesModal}
          disabled={!hasCookies}
          containerStyle={styles.confirm}
        >
          {strings('app_settings.clear_browser_cookies_desc')}
        </StyledButton>
      </View>
      <ActionModal
        modalVisible={cookiesModalVisible}
        confirmText={strings('app_settings.clear')}
        cancelText={strings('app_settings.reset_account_cancel_button')}
        onCancelPress={toggleClearCookiesModal}
        onRequestClose={toggleClearCookiesModal}
        onConfirmPress={clearCookies}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>
            {strings('app_settings.clear_cookies_modal_title')}
          </Text>
          <Text style={styles.modalText}>
            {strings('app_settings.clear_cookies_modal_message')}
          </Text>
        </View>
      </ActionModal>
    </>
  );
};

export default ClearCookiesSection;
