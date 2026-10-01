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
import { applyVbaDevOverrides } from '../vbaDevOverrides';

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

export interface OpenVbaOnboardingRequest {
  source?: string;
  /**
   * Re-enter identity verification when hydrate still reports a rejected KYC
   * session. Without this, Try again on the failure page routes back to itself.
   */
  retryRejectedKyc?: boolean;
}

const resolveOpenRequest = (
  request: string | OpenVbaOnboardingRequest | undefined,
  defaultSource: string,
): { source: string; retryRejectedKyc: boolean } => {
  if (typeof request === 'string') {
    return { source: request, retryRejectedKyc: false };
  }

  return {
    source: request?.source ?? defaultSource,
    retryRejectedKyc: request?.retryRejectedKyc === true,
  };
};

/**
 * Hydrates VBA onboarding facts and opens the first incomplete module. This is
 * the single coordinator API used for entry, retry, and module completion.
 *
 * @param defaultSource - Caller/entry point for error telemetry.
 * @returns An async callback. Pass a source string, or `{ retryRejectedKyc: true }` from the KYC failure page.
 */
export const useOpenVbaOnboarding = (
  defaultSource = 'unspecified',
): ((request?: string | OpenVbaOnboardingRequest) => Promise<void>) => {
  const navigation = useNavigation<AppNavigationProp>();

  return useCallback(
    async (request?: string | OpenVbaOnboardingRequest): Promise<void> => {
      const { source, retryRejectedKyc } = resolveOpenRequest(
        request,
        defaultSource,
      );
      try {
        const walletAddress = selectSelectedVbaWalletAddress(
          ReduxService.store.getState() as RootState,
        );
        if (!walletAddress) {
          openRecoverableError(navigation);
          return;
        }

        const accountSnapshot: RampsVbaOnboardingSnapshot =
          applyVbaDevOverrides(
            await Engine.context.RampsController.hydrateVbaOnboarding({
              walletAddress,
            }),
          );
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
        const hydratedDestination = getVbaDestinationForSnapshot(snapshot);
        const destinationId =
          retryRejectedKyc && hydratedDestination === 'kycRejected'
            ? 'identityVerification'
            : hydratedDestination;
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
