import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { View } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import Pressable from '../../../../../../../component-library/components-temp/Pressable';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../../component-library/components/Texts/Text';
import AppConstants from '../../../../../../../core/AppConstants';
import { useStyles } from '../../../../../../hooks/useStyles';
import styleSheet from './LegalLinks.styles';

const FooterLegalLinks = () => {
  const { styles } = useStyles(styleSheet, {});

  const navigation = useNavigation();

  const handleNavigateToWebView = (url: string) =>
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: { url },
    });

  return (
    <View style={styles.termsOfServiceButtonGroup}>
      <Pressable
        onPress={() =>
          handleNavigateToWebView(AppConstants.URLS.TERMS_AND_CONDITIONS)
        }
        style={styles.legalLink}
      >
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
          {strings('stake.terms_of_service')}
        </Text>
      </Pressable>
      <Pressable
        onPress={() =>
          handleNavigateToWebView(AppConstants.URLS.STAKING_RISK_DISCLOSURE)
        }
        style={styles.legalLink}
      >
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
          {strings('stake.risk_disclosure')}
        </Text>
      </Pressable>
    </View>
  );
};

export default FooterLegalLinks;
