import React, { useCallback } from 'react';
import { Linking } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Routes from '../../../../../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../../../../../constants/urls';
import { useSupportConsent } from '../../../../../hooks/useSupportConsent';
import VbaAccountCreateError from '../VbaAccountCreateError';
import { buildAccountCreateSupportUrl } from '../accountCreateError';
import { useOpenVbaOnboarding } from '../hooks/useVbaOnboardingRouting';
import type { VbaOnboardingParamList } from '../routes';

/**
 * Wires the account-creation error screens into onboarding.
 * `details` asks support to finish setup. `generic` can be retried.
 */
const VbaAccountCreateErrorAdapter = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<VbaOnboardingParamList, 'VbaAccountCreateError'>>();
  const { variant, failure } = route.params;
  const retry = useOpenVbaOnboarding('account-create-error-retry');
  const { openSupportWithConsent } = useSupportConsent();

  const leave = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  const contactSupport = useCallback(() => {
    openSupportWithConsent(
      (url) => Linking.openURL(url),
      buildAccountCreateSupportUrl(METAMASK_SUPPORT_URL, failure),
    );
  }, [failure, openSupportWithConsent]);

  if (variant === 'details') {
    return (
      <VbaAccountCreateError
        variant="details"
        onPrimary={contactSupport}
        onSecondary={leave}
        onBack={leave}
      />
    );
  }

  return (
    <VbaAccountCreateError
      variant="generic"
      onPrimary={() => retry()}
      onSecondary={leave}
      onBack={leave}
    />
  );
};

export default VbaAccountCreateErrorAdapter;
