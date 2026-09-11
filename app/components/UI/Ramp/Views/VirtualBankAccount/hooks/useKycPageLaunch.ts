import { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { KycConsentRecord } from '@metamask/kyc-controller';
import Engine from '../../../../../../core/Engine';
import Routes from '../../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';

export interface KycPageParams {
  providerDisclaimersAccepted: KycConsentRecord[];
  idosDisclaimersAccepted: KycConsentRecord[];
}

/**
 * Starts or resumes the Iron KYC flow while the dedicated KYC page is focused.
 *
 * Routing decides whether KYC must be open. The page owns controller
 * initialization so routing never presents SumSub directly.
 */
export function useKycPageLaunch(params?: KycPageParams): void {
  const navigation = useNavigation<AppNavigationProp>();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const launch = async () => {
        try {
          if (params) {
            await Engine.context.KycController.acceptTermsAndStartSession({
              product: 'money',
              providerDisclaimersAccepted: params.providerDisclaimersAccepted,
              idosDisclaimersAccepted: params.idosDisclaimersAccepted,
            });
          } else {
            await Engine.context.KycController.initialize({
              product: 'money',
              vendor: 'iron',
            });
          }
        } catch {
          // KycController records the failure. The router will hydrate again
          // and show the resulting retryable stage.
        } finally {
          if (isActive) {
            navigation.reset({
              index: 0,
              routes: [{ name: Routes.RAMP.VBA_ONBOARDING }],
            });
          }
        }
      };

      launch();

      return () => {
        isActive = false;
      };
    }, [navigation, params]),
  );
}
