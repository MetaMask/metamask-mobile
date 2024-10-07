import React from 'react';
import { ScrollView } from 'react-native';
import { useStyles } from '../../../../component-library/hooks';
import { useOnboardingHeader } from '../../../hooks/useOnboardingHeader';
import { strings } from '../../../../../locales/i18n';
import NetworkDetailsCheckSettings from '../../Settings/NetworkDetailsCheckSettings';
import styleSheet from '../DefaultSettings/index.styles';

const SecuritySettings = () => {
  const { styles } = useStyles(styleSheet, {});
  useOnboardingHeader(strings('default_settings.drawer_security_title'));
  return (
    <ScrollView style={styles.root}>
      <NetworkDetailsCheckSettings />
    </ScrollView>
  );
};

export default SecuritySettings;
