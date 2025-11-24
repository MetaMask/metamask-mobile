import CookieManager from '@react-native-cookies/cookies';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Device from '../../../../../util/device';
import Logger from '../../../../../util/Logger';
import ActionModal from '../../../../UI/ActionModal';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';

const createStyles = () =>
  StyleSheet.create({
    setting: {
      marginTop: 32,
    },
    desc: {
      marginTop: 8,
    },
    accessory: {
      marginTop: 16,
    },
    modalView: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 20,
    },
    modalTitle: {
      textAlign: 'center',
      marginBottom: 20,
    },
    modalText: {
      textAlign: 'center',
    },
  });

const ClearCookiesSection = () => {
  const [cookiesModalVisible, setCookiesModalVisible] = useState(false);
  const [hasCookies, setHasCookies] = useState(false);
  const styles = createStyles();

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
      <View style={styles.setting}>
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('app_settings.clear_browser_cookies_desc')}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.desc}
        >
          {strings('app_settings.clear_cookies_desc')}
        </Text>
        <View style={styles.accessory}>
          <Button
            size={ButtonSize.Lg}
            variant={ButtonVariants.Secondary}
            width={ButtonWidthTypes.Full}
            label={strings('app_settings.clear_browser_cookies_desc')}
            onPress={toggleClearCookiesModal}
            isDisabled={!hasCookies}
          />
        </View>
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
          <Text variant={TextVariant.HeadingMD} style={styles.modalTitle}>
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
