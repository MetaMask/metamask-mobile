import React from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { useOnboardingHeader } from '../../../hooks/useOnboardingHeader';
import { strings } from '../../../../../locales/i18n';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import NetworkDetailsCheckSettings from '../../Settings/NetworkDetailsCheckSettings';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import MetaMetricsAndDataCollectionSection from '../../Settings/SecuritySettings/Sections/MetaMetricsAndDataCollectionSection/MetaMetricsAndDataCollectionSection';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import DeleteMetaMetricsData from '../../Settings/SecuritySettings/Sections/DeleteMetaMetricsData';
import { selectSeedlessOnboardingLoginFlow } from '../../../../selectors/seedlessOnboardingController';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { SEEDLESS_ONBOARDING_ENABLED } from '../../../../core/OAuthService/OAuthLoginHandlers/constants';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const SecuritySettings = () => {
  const tw = useTailwind();
  const { isEnabled } = useAnalytics();
  const analyticsEnabled = isEnabled();
  const navigation = useNavigation();
  const isSocialLogin = useSelector(selectSeedlessOnboardingLoginFlow);

  const shouldShowSocialLoginFeatures =
    SEEDLESS_ONBOARDING_ENABLED && isSocialLogin;

  useOnboardingHeader(strings('default_settings.drawer_security_title'));

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        includesTopInset
        title={strings('default_settings.drawer_security_title')}
        onBack={() => navigation.goBack()}
      />
      <ScrollView style={tw.style('flex-1 pt-4 px-4')}>
        <NetworkDetailsCheckSettings />
        {shouldShowSocialLoginFeatures && (
          <>
            <MetaMetricsAndDataCollectionSection
              hideMarketingSection
              analyticsLocation="onboarding_default_settings"
            />
            <DeleteMetaMetricsData metricsOptin={analyticsEnabled} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SecuritySettings;
