import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import type { KycStep, KycStepStatus } from '@metamask/kyc-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import type { RootState } from '../../../../reducers';
import { KALSHI_KYC_VENDOR } from '../vendors/kalshi';

/**
 * What the Kalshi banner shows, one entry per status it can be in.
 */
export type KalshiBannerState =
  | 'getStarted'
  | 'needMoreInfo'
  | 'stepUp'
  | 'verifying'
  | 'cantVerify'
  | 'verified';

/**
 * Maps where kyc-api says the user is to the banner to show.
 *
 * - No step yet, `mfa` or `terms`: the entry banner. The user has not given
 * any identity details yet.
 * - Email or phone link, or SumSub for the first time: resume the flow.
 * - SumSub with status `retry`: Kalshi asks for another identity check.
 * - `decision`: approved is verified, rejected can't verify, anything else is
 * still under review.
 *
 * @param step - The vendor step from the onboarding controller.
 * @param status - The step's status from the onboarding controller.
 * @returns The banner state.
 */
export const getKalshiBannerState = (
  step: KycStep | null | undefined,
  status: KycStepStatus | null | undefined,
): KalshiBannerState => {
  switch (step) {
    case 'kalshi_email_link':
    case 'kalshi_phone_link':
      return 'needMoreInfo';
    case 'sumsub':
      return status === 'retry' ? 'stepUp' : 'needMoreInfo';
    // kyc-api never sends `error`; it is the client's fallback for a step it
    // does not know. The onboarding screen offers "Check again" for it, so
    // the banner sends the user back in rather than calling them rejected.
    case 'error':
      return 'needMoreInfo';
    case 'decision':
      if (status === 'approved') {
        return 'verified';
      }
      return status === 'rejected' ? 'cantVerify' : 'verifying';
    case 'mfa':
    case 'terms':
    default:
      return 'getStarted';
  }
};

const selectKalshiBannerState = (state: RootState): KalshiBannerState => {
  const vendor =
    state.engine.backgroundState.VendorOnboardingController?.vendors?.[
      KALSHI_KYC_VENDOR.id
    ];
  return getKalshiBannerState(vendor?.step, vendor?.status);
};

/**
 * The Kalshi banner state for the current screen. Asks kyc-api for the step
 * each time the screen gains focus, so a user who finished on another device,
 * before a reinstall, or in the onboarding flow sees where they really are.
 *
 * @returns The banner state.
 */
export const useKalshiBannerState = (): KalshiBannerState => {
  const bannerState = useSelector(selectKalshiBannerState);

  useFocusEffect(
    useCallback(() => {
      Engine.context.VendorOnboardingController.refreshStep({
        vendor: KALSHI_KYC_VENDOR.id,
      }).catch((error: unknown) => {
        Logger.error(error as Error, {
          tags: { feature: KALSHI_KYC_VENDOR.loggerFeature },
        });
      });
    }, []),
  );

  return bannerState;
};
