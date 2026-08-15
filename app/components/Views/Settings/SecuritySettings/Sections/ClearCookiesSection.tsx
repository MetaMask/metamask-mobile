import React from 'react';
import { StyleSheet, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
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
      marginTop: 24,
    },
    desc: {
      marginTop: 8,
    },
    accessory: {
      marginTop: 16,
    },
  });

interface ClearCookiesSectionProps {
  hasCookies: boolean;
  onPressClearCookies: () => void;
}

const ClearCookiesSection = ({
  hasCookies,
  onPressClearCookies,
}: ClearCookiesSectionProps) => {
  const styles = createStyles();

  return (
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
          onPress={onPressClearCookies}
          isDisabled={!hasCookies}
        >
          {strings('app_settings.clear_browser_cookies_desc')}
        </Button>
      </View>
    </View>
  );
};

export default ClearCookiesSection;
