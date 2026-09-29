import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Engine from '../../../../../../core/Engine';
import ReduxService from '../../../../../../core/redux';
import Logger from '../../../../../../util/Logger';
import { selectSelectedVbaWalletAddress } from '../../../../../../selectors/rampsController';
import type { RootState } from '../../../../../../reducers';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  getVbaDestinationForSnapshot,
  type VbaOnboardingDestinationId,
} from '../vbaOnboardingFunnel';
import type { VbaOnboardingSnapshot as RampsVbaOnboardingSnapshot } from '@metamask/ramps-controller';
import type { VbaOnboardingSnapshot } from '../vbaOnboardingSnapshot';
import {
  getVbaVendorTermsAcceptance,
  hasAcceptedVbaVendorTerms,
} from '../vbaVendorTermsStorage';
import { VbaOnboardingRoutes } from '../routes';

export const navigateToVbaOnboardingDestination = (
  navigation: AppNavigationProp,
  destinationId: VbaOnboardingDestinationId,
  snapshot?: VbaOnboardingSnapshot,
): void => {
  if (destinationId === 'complete') {
    navigation.navigate(Routes.RAMP.VBA_ONBOARDING, {
      screen: VbaOnboardingRoutes.DETAILS,
    });
    return;
  }
  if (destinationId === 'identityVerification') {
    navigation.navigate(
      Routes.RAMP.VBA_ONBOARDING,
      snapshot
        ? {
            screen: VbaOnboardingRoutes.IDENTITY_VERIFICATION,
            params: { snapshot },
          }
        : { screen: VbaOnboardingRoutes.ERROR },
    );
    return;
  }

  const screen = {
    vendorTerms: VbaOnboardingRoutes.VENDOR_TERMS,
    email: VbaOnboardingRoutes.EMAIL,
    kycPending: VbaOnboardingRoutes.KYC_PENDING,
    kycRejected: VbaOnboardingRoutes.KYC_REJECTED,
    accountProvisioningError: VbaOnboardingRoutes.ACCOUNT_PROVISIONING_ERROR,
    error: VbaOnboardingRoutes.ERROR,
  }[destinationId];

  navigation.navigate(Routes.RAMP.VBA_ONBOARDING, { screen });
};

const openRecoverableError = (navigation: AppNavigationProp): void => {
  navigateToVbaOnboardingDestination(navigation, 'error');
};

/**
 * Hydrates VBA onboarding facts and opens the first incomplete module. This is
 * the single coordinator API used for entry, retry, and module completion.
 *
 * @param defaultSource - Caller/entry point for error telemetry.
 * @returns An async callback accepting an optional `source` override.
 */
export const useOpenVbaOnboarding = (
  defaultSource = 'unspecified',
): ((source?: string) => Promise<void>) => {
  const navigation = useNavigation<AppNavigationProp>();

  return useCallback(
    async (source: string = defaultSource): Promise<void> => {
      try {
        const walletAddress = selectSelectedVbaWalletAddress(
          ReduxService.store.getState() as RootState,
        );
        if (!walletAddress) {
          openRecoverableError(navigation);
          return;
        }

        const accountSnapshot: RampsVbaOnboardingSnapshot =
          await Engine.context.RampsController.hydrateVbaOnboarding({
            walletAddress,
          });
        if (
          accountSnapshot.sessionExists &&
          !accountSnapshot.vendorDisclaimersComplete
        ) {
          try {
            const vendorTermsAcceptance =
              await getVbaVendorTermsAcceptance(walletAddress);
            if (vendorTermsAcceptance?.disclaimerIds.length) {
              await Engine.context.KycController.recordVendorDisclaimers({
                disclaimerIds: vendorTermsAcceptance.disclaimerIds,
              });
            }
          } catch (error) {
            Logger.error(error as Error, {
              tags: { feature: 'vba-onboarding' },
              context: {
                name: 'useOpenVbaOnboarding',
                data: { source, step: 'recordVendorDisclaimers' },
              },
            });
          }
        }
        const snapshot: VbaOnboardingSnapshot = {
          ...accountSnapshot,
          vendorTermsAcceptedLocally:
            accountSnapshot.vendorDisclaimersComplete ||
            (await hasAcceptedVbaVendorTerms(walletAddress)),
        };
        const destinationId = getVbaDestinationForSnapshot(snapshot);
        Logger.log('[vba-onboarding] resume', {
          source,
          snapshot,
          destinationId,
        });
        navigateToVbaOnboardingDestination(navigation, destinationId, snapshot);
      } catch (error) {
        Logger.error(error as Error, {
          tags: { feature: 'vba-onboarding' },
          context: {
            name: 'useOpenVbaOnboarding',
            data: { source },
          },
        });
        openRecoverableError(navigation);
      }
    },
    [navigation, defaultSource],
  );
};
