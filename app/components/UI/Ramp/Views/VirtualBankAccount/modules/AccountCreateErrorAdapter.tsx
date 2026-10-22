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
import { useOpenVbaOnboarding } from '../hooks/useVbaOnboardingRouting';
import type { VbaOnboardingParamList } from '../routes';

/**
 * Wires the account-creation error screen into onboarding. Edit details
 * returns to the caller because the bank-details form is not in this flow yet.
 */
const VbaAccountCreateErrorAdapter = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<VbaOnboardingParamList, 'VbaAccountCreateError'>>();
  const variant = route.params.variant;
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
    openSupportWithConsent((url) => Linking.openURL(url), METAMASK_SUPPORT_URL);
  }, [openSupportWithConsent]);

  if (variant === 'details') {
    return (
      <VbaAccountCreateError
        variant="details"
        onPrimary={leave}
        onBack={leave}
      />
    );
  }

  if (variant === 'blocked') {
    return (
      <VbaAccountCreateError
        variant="blocked"
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
      onSecondary={contactSupport}
      onBack={leave}
    />
  );
};

export default VbaAccountCreateErrorAdapter;
