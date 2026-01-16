import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { View } from 'react-native';
import TouchableOpacity from '../../../../../../Base/TouchableOpacity';
import { strings } from '../../../../../../../../locales/i18n';
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
      <TouchableOpacity
        activeOpacity={0.5}
        onPress={() =>
          handleNavigateToWebView(AppConstants.URLS.TERMS_AND_CONDITIONS)
        }
        style={styles.legalLink}
      >
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
          {strings('stake.terms_of_service')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.5}
        onPress={() =>
          handleNavigateToWebView(AppConstants.URLS.STAKING_RISK_DISCLOSURE)
        }
        style={styles.legalLink}
      >
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
          {strings('stake.risk_disclosure')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default FooterLegalLinks;
