import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import VbaIllustration, { VbaIllustrationSource } from './VbaIllustration';
import VbaOnboardingStatusScreen from './VbaOnboardingStatusScreen';

export const VbaKycPendingSelectorsIDs = {
  CONTAINER: 'vba-kyc-pending',
  COME_BACK_LATER_BUTTON: 'vba-kyc-pending-come-back-later-button',
} as const;

/**
 * Shown while identity verification is in flight. Leaving returns to Money home.
 */
const VbaKycPending = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const handleComeBackLater = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  return (
    <VbaOnboardingStatusScreen
      visual={<VbaIllustration source={VbaIllustrationSource.scanner} />}
      title={strings('virtual_bank_account.kyc_verifying.title')}
      description={strings('virtual_bank_account.kyc_verifying.description')}
      action={{
        label: strings('virtual_bank_account.kyc_verifying.button'),
        onPress: handleComeBackLater,
        testID: VbaKycPendingSelectorsIDs.COME_BACK_LATER_BUTTON,
      }}
      testID={VbaKycPendingSelectorsIDs.CONTAINER}
    />
  );
};

export default VbaKycPending;
