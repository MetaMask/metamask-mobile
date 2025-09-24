import React, { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { useStyles } from '../../../../component-library/hooks';
import { useOnboardingHeader } from '../../../hooks/useOnboardingHeader';
import { strings } from '../../../../../locales/i18n';
import NetworkDetailsCheckSettings from '../../Settings/NetworkDetailsCheckSettings';
import MetaMetricsAndDataCollectionSection from '../../Settings/SecuritySettings/Sections/MetaMetricsAndDataCollectionSection/MetaMetricsAndDataCollectionSection';
import DeleteMetaMetricsData from '../../Settings/SecuritySettings/Sections/DeleteMetaMetricsData';
import { selectSeedlessOnboardingAuthConnection } from '../../../../selectors/seedlessOnboardingController';
import { AuthConnection } from '@metamask/seedless-onboarding-controller';
import { useMetrics } from '../../../hooks/useMetrics';
import styleSheet from '../DefaultSettings/index.styles';

const SecuritySettings = () => {
  const { styles } = useStyles(styleSheet, {});
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const { isEnabled } = useMetrics();

  const authConnection = useSelector(selectSeedlessOnboardingAuthConnection);

  const isSocialLogin =
    authConnection === AuthConnection.Google ||
    authConnection === AuthConnection.Apple;

  useOnboardingHeader(strings('default_settings.drawer_security_title'));

  useEffect(() => {
    setAnalyticsEnabled(isEnabled());
  }, [isEnabled]);

  return (
    <ScrollView style={styles.root}>
      <NetworkDetailsCheckSettings />
      {isSocialLogin && (
        <>
          <MetaMetricsAndDataCollectionSection hideMarketingSection />
          <DeleteMetaMetricsData metricsOptin={analyticsEnabled} />
        </>
      )}
    </ScrollView>
  );
};

export default SecuritySettings;
