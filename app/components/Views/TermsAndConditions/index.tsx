import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import { useTheme } from '../../../util/theme';
import type { Colors } from '../../../util/theme/models';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { TermsAndConditionsSelectorsIDs } from './TermsAndConditions.testIds';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    text: {
      ...fontStyles.normal,
      color: colors.text.alternative,
      textAlign: 'center',
      fontSize: 10,
    },
    link: {
      textDecorationLine: 'underline',
    },
  });

interface TermsAndConditionsProps {
  navigation: AppNavigationProp;
}

/**
 * View that is displayed in the flow to agree terms and conditions
 */
const TermsAndConditions = ({ navigation }: TermsAndConditionsProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const handlePress = () => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: AppConstants.URLS.TERMS_AND_CONDITIONS,
        title: strings('terms_and_conditions.title'),
      },
    });
  };

  return (
    <TouchableOpacity
      testID={TermsAndConditionsSelectorsIDs.ACCEPT_BUTTON}
      onPress={handlePress}
    >
      <Text style={styles.text}>
        {strings('terms_and_conditions.description')}
        <Text style={styles.link}>{strings('terms_and_conditions.terms')}</Text>
        .
      </Text>
    </TouchableOpacity>
  );
};

export default TermsAndConditions;
