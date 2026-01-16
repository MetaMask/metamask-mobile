import React from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';
import { useStyles } from '../../../../component-library/hooks';
import { useOnboardingHeader } from '../../../hooks/useOnboardingHeader';
import { strings } from '../../../../../locales/i18n';
import NetworkDetailsCheckSettings from '../../Settings/NetworkDetailsCheckSettings';
import MetaMetricsAndDataCollectionSection from '../../Settings/SecuritySettings/Sections/MetaMetricsAndDataCollectionSection/MetaMetricsAndDataCollectionSection';
import DeleteMetaMetricsData from '../../Settings/SecuritySettings/Sections/DeleteMetaMetricsData';
import { selectSeedlessOnboardingLoginFlow } from '../../../../selectors/seedlessOnboardingController';
import { useMetrics } from '../../../hooks/useMetrics';
import { SEEDLESS_ONBOARDING_ENABLED } from '../../../../core/OAuthService/OAuthLoginHandlers/constants';
import styleSheet from '../DefaultSettings/index.styles';

const SecuritySettings = () => {
  const { styles } = useStyles(styleSheet, {});
  const { isEnabled } = useMetrics();
  const analyticsEnabled = isEnabled();

  const isSocialLogin = useSelector(selectSeedlessOnboardingLoginFlow);

  const shouldShowSocialLoginFeatures =
    SEEDLESS_ONBOARDING_ENABLED && isSocialLogin;

  useOnboardingHeader(strings('default_settings.drawer_security_title'));

  return (
    <ScrollView style={styles.scrollRoot}>
      <NetworkDetailsCheckSettings />
      {shouldShowSocialLoginFeatures && (
        <>
          <MetaMetricsAndDataCollectionSection hideMarketingSection />
          <DeleteMetaMetricsData metricsOptin={analyticsEnabled} />
        </>
      )}
    </ScrollView>
  );
};

export default SecuritySettings;
