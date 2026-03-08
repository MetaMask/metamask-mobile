import { providerErrors } from '@metamask/rpc-errors';
import { useEffect, useMemo } from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { selectUnapprovedMusdConversions } from '../selectors/musdConversionStatus';

/**
 * Routes that indicate the user is actively in the mUSD confirmation flow.
 * When the focused route is one of these, a background/foreground cycle is
 * most likely caused by a transient external link (e.g. "terms apply") and
 * the pending approval should not be rejected.
 */
const ACTIVE_CONFIRMATION_FLOW_ROUTES = new Set([
  Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
  Routes.SHEET.TOOLTIP_MODAL,
]);

const isRouteInActiveConfirmationFlow = (): boolean => {
  const currentRoute = NavigationService.navigation.getCurrentRoute();
  return ACTIVE_CONFIRMATION_FLOW_ROUTES.has(currentRoute?.name ?? '');
};

const rejectStaleApprovals = (transactionIds: string[]) => {
  Logger.log(
    '[mUSD Conversion] Rejecting stale pending approvals on foreground',
    {
      count: transactionIds.length,
      transactionIds,
    },
  );

  for (const transactionId of transactionIds) {
    Engine.rejectPendingApproval(
      transactionId,
      providerErrors.userRejectedRequest({
        message:
          'Automatically rejected stale mUSD conversion pending approval on app foreground',
        data: {
          cause: 'useMusdConversionStaleApprovalCleanup',
          transactionId,
        },
      }),
      {
        ignoreMissing: true,
        logErrors: false,
      },
    );
  }

  // Pop the orphaned confirmation screen on the next frame so React
  // finishes processing the approval-rejection state updates first.
  requestAnimationFrame(() => {
    const orphanedRoute = NavigationService.navigation.getCurrentRoute();
    if (
      orphanedRoute?.name ===
      Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS
    ) {
      NavigationService.navigation.goBack();
    }
  });
};

/**
 * Rejects stale mUSD conversion pending approvals on app foreground.
 *
 * If the app backgrounds while a mUSD conversion is pending approval, some
 * flows can stay disabled because the pending approval remains unresolved.
 * This hook rejects those stale unapproved mUSD approvals when the app returns
 * to active state, with the following safeguards:
 *
 * If the user is NOT on a confirmation screen, approvals are rejected
 * immediately (standard stale cleanup).
 *
 * If the user IS on a confirmation screen (or a modal on top of it such as
 * a tooltip), the hook checks whether the foreground was triggered by an
 * incoming deeplink. It listens for Linking 'url' events, which fire when
 * the app receives a URL from an external source (deeplink) but do NOT fire
 * when the user returns from Linking.openURL() (e.g. tapping "terms apply").
 * If a URL event was received while backgrounded, the approval is rejected.
 * Otherwise the approval is preserved.
 */
export const useMusdConversionStaleApprovalCleanup = () => {
  const pendingUnapprovedMusdConversions = useSelector(
    selectUnapprovedMusdConversions,
  );

  const pendingMusdUnapprovedTransactionIds = useMemo(
    () =>
      pendingUnapprovedMusdConversions.map(
        (transactionMeta) => transactionMeta.id,
      ),
    [pendingUnapprovedMusdConversions],
  );

  useEffect(() => {
    let previousAppState = AppState.currentState;
    let deeplinkReceivedWhileBackgrounded = false;

    // Linking 'url' fires when the app receives a URL from an external
    // source (deeplink, universal link). It does NOT fire when the user
    // returns from Linking.openURL() (opening the browser).
    const handleIncomingUrl = () => {
      if (previousAppState === 'background') {
        deeplinkReceivedWhileBackgrounded = true;
      }
    };

    const urlSubscription = Linking.addEventListener('url', handleIncomingUrl);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        deeplinkReceivedWhileBackgrounded = false;
        previousAppState = nextAppState;
        return;
      }

      // Only treat a true background return as stale approval cleanup signal.
      // iOS transient system overlays (Notification/Control Center) can emit
      // active -> inactive -> active and should not clear pending approvals.
      const shouldRejectStaleApprovals =
        previousAppState === 'background' && nextAppState === 'active';

      if (!shouldRejectStaleApprovals) {
        previousAppState = nextAppState;
        return;
      }

      if (pendingMusdUnapprovedTransactionIds.length === 0) {
        previousAppState = nextAppState;
        return;
      }

      previousAppState = nextAppState;

      if (isRouteInActiveConfirmationFlow()) {
        if (!deeplinkReceivedWhileBackgrounded) {
          Logger.log(
            '[mUSD Conversion] Skipping stale approval cleanup — user is in active confirmation flow',
          );
          deeplinkReceivedWhileBackgrounded = false;
          return;
        }

        Logger.log(
          '[mUSD Conversion] Incoming deeplink detected while on confirmation screen — rejecting stale approvals',
        );
      }

      deeplinkReceivedWhileBackgrounded = false;
      rejectStaleApprovals(pendingMusdUnapprovedTransactionIds);
    };

    const appStateListener = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      appStateListener.remove();
      urlSubscription.remove();
    };
  }, [pendingMusdUnapprovedTransactionIds]);
};
