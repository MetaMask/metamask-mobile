import { createSelector } from 'reselect';
import { hasProperty } from '@metamask/utils';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

const DEFAULT_CROSSMINT_APPLE_PAY_CHECKOUT = false;

/**
 * Select whether the Crossmint embedded Apple Pay checkout overlay is
 * enabled (LaunchDarkly flag `crossmintApplePayCheckout`).
 *
 * When enabled and the selected UB2 quote is a Crossmint quote paid with
 * Apple Pay on iOS, the amount screen replaces the Continue button with
 * Crossmint's hosted Apple Pay button (clipped WebView) that opens the
 * native OS payment sheet.
 * Handles the version-gated flag shape
 * `{ enabled: boolean, minimumVersion: string }` and boolean overrides.
 * Defaults to false when the flag is absent or invalid.
 */
export const selectCrossmintApplePayCheckoutEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    if (
      !hasProperty(
        remoteFeatureFlags,
        FeatureFlagNames.crossmintApplePayCheckout,
      )
    ) {
      return DEFAULT_CROSSMINT_APPLE_PAY_CHECKOUT;
    }
    const rawFlag =
      remoteFeatureFlags[FeatureFlagNames.crossmintApplePayCheckout];

    if (typeof rawFlag === 'boolean') {
      return rawFlag;
    }

    const remoteFlag = rawFlag as unknown as VersionGatedFeatureFlag;
    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ??
      DEFAULT_CROSSMINT_APPLE_PAY_CHECKOUT
    );
  },
);
