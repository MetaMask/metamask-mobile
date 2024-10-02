import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, TouchableOpacity } from 'react-native';
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

  const handleNavigateToTermsOfUse = () =>
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: AppConstants.URLS.TERMS_AND_CONDITIONS,
      },
    });

  const handleNavigateToRiskDisclosure = () =>
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: AppConstants.URLS.STAKING_RISK_DISCLOSURE,
      },
    });

  return (
    <View style={styles.termsOfServiceButtonGroup}>
      <TouchableOpacity
        activeOpacity={0.5}
        onPress={handleNavigateToTermsOfUse}
        style={styles.legalLink}
      >
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
          {strings('stake.terms_of_service')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.5}
        onPress={handleNavigateToRiskDisclosure}
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
