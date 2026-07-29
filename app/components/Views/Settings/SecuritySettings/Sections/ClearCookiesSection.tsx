import CookieManager from '@react-native-cookies/cookies';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Device from '../../../../../util/device';
import Logger from '../../../../../util/Logger';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

const createStyles = () =>
  StyleSheet.create({
    setting: {
      marginTop: 0,
      paddingVertical: 16,
    },
    desc: {
      marginTop: 8,
      lineHeight: 20,
    },
    accessory: {
      marginTop: 12,
    },
  });

interface ClearCookiesSectionProps {
  openConfirmSheet: (config: {
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void | Promise<void>;
  }) => void;
}

const ClearCookiesSection = ({
  openConfirmSheet,
}: ClearCookiesSectionProps) => {
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

  const clearCookies = async () => {
    const useWebKit = true;
    await CookieManager.clearAll(useWebKit);
    Logger.log('Browser cookies cleared');

    if (Device.isIos()) {
      const cookies = await CookieManager.getAll(useWebKit);
      setHasCookies(Object.keys(cookies).length > 0);
    }
  };

  const openClearCookiesSheet = () =>
    openConfirmSheet({
      title: strings('app_settings.clear_cookies_modal_title'),
      message: strings('app_settings.clear_cookies_modal_message'),
      confirmText: strings('app_settings.clear'),
      cancelText: strings('app_settings.reset_account_cancel_button'),
      onConfirm: clearCookies,
    });

  return (
    <>
      <View style={styles.setting}>
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings('app_settings.clear_browser_cookies_desc')}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          style={styles.desc}
        >
          {strings('app_settings.clear_cookies_desc')}
        </Text>
        <View style={styles.accessory}>
          <Button
            size={ButtonSize.Lg}
            variant={ButtonVariant.Secondary}
            isFullWidth
            onPress={openClearCookiesSheet}
            isDisabled={!hasCookies}
          >
            {strings('app_settings.clear_browser_cookies_desc')}
          </Button>
        </View>
      </View>
    </>
  );
};

export default ClearCookiesSection;
