import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { hydrateAndNavigateVbaOnboarding } from '../hydrateAndNavigateVbaOnboarding';

/**
 * Launches the SumSub document-verification SDK once on mount, then re-hydrates
 * VBA onboarding and routes to whatever stage the KYC outcome resolves to
 * (pending, rejected, completed, ...).
 *
 * Provider terms are accepted on the previous screen; by the time this hook
 * runs the flow is at `KycRequired`, so all that remains is to open SumSub via
 * {@link Engine.context.KycController.startSumSub} (which creates the UKYC
 * session on demand). On abandonment or failure it returns to the previous
 * screen so the user can retry. The hosting screen renders only a lightweight
 * placeholder; the SDK presents itself over it.
 */
export const useLaunchSumSub = (): void => {
  const navigation = useNavigation<AppNavigationProp>();
  // Effects can re-run (React 18 strict-mode double-invoke, re-renders); the
  // SDK must be launched exactly once per screen mount.
  const hasLaunchedRef = useRef(false);

  useEffect(() => {
    if (hasLaunchedRef.current) {
      return;
    }
    hasLaunchedRef.current = true;

    const launch = async () => {
      try {
        await Engine.context.KycController.startSumSub();
        const { status } = Engine.context.KycController.state.sumsub;
        // The applicant closed the SDK, or launching/journey creation failed.
        // Either way the SumSub verification did not progress, so return to the
        // previous screen instead of re-hydrating onto this same screen (which
        // would leave the launcher spinner up indefinitely). A failure keeps the
        // session, so the user can retry.
        if (status === 'abandoned' || status === 'failed') {
          Logger.log(`[VBA KYC] Sumsub did not complete: ${status}`);
          navigation.goBack();
          return;
        }
        await hydrateAndNavigateVbaOnboarding(navigation, 'sumsub-continue');
      } catch (error) {
        Logger.error(error as Error, {
          tags: { feature: 'vba-kyc', provider: 'sumsub' },
        });
        navigation.goBack();
      }
    };

    launch();
  }, [navigation]);
};
