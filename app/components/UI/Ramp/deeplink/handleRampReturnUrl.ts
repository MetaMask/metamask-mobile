import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import Logger from '../../../../util/Logger';
import {
  clearExternalReturnCorrelation,
  completeHeadlessExternalReturn,
  emitExternalOrderFailed,
  findExternalReturnCorrelationForDeeplink,
  type ExternalReturnCorrelation,
} from '../headless/externalBrowserReturn';
import { dismissHeadlessEntryFromRoot } from '../headless/headlessEntryNavigation';
import { failSession, getSession } from '../headless/sessionRegistry';

interface HandleRampReturnUrlParams {
  rampReturnPath: string;
}

/**
 * Handles the `metamask://on-ramp/...` return deeplink from an external
 * provider checkout.
 *
 * Headless path (P2.M2): when an external-browser launch recorded a return
 * correlation, the deeplink is resolved into an order via the shared
 * callback resolver and completes the headless session (`onOrderCreated`),
 * instead of navigating to the order-details screen the headless consumer
 * never opened. E2 (P2.M3): the correlation retains the session's
 * `onOrderCreated`, so a success deeplink completes the order even when the
 * session was already dismissed or GC'd — only a return with no recoverable
 * success and no live session falls back to today's behavior.
 *
 * Non-headless path: unchanged — navigate to RAMPS_ORDER_DETAILS with any
 * `orderId` carried in the query.
 */
export default function handleRampReturnUrl({
  rampReturnPath,
}: HandleRampReturnUrlParams) {
  try {
    const parsed = new URL(rampReturnPath, 'https://placeholder.local');
    const orderId = parsed.searchParams.get('orderId') ?? undefined;
    const providerCodeFromPath =
      parsed.pathname.match(/providers\/([^/?#]+)/u)?.[1];

    // Match the return to a pending headless launch by its ORDER ID (the
    // GUID minted at widget creation rides both the precreated stub and the
    // provider's return deeplink). A deeplink that matches no record — e.g.
    // a non-headless UB1/UB2 external return — takes the legacy path below.
    const correlation = findExternalReturnCorrelationForDeeplink({
      orderId,
      providerCode: providerCodeFromPath,
    });
    if (correlation) {
      completeExternalReturnFromDeeplink({
        correlation,
        rampReturnPath,
        orderId,
        providerCodeFromPath,
      }).catch((error) => {
        // Defensive: completeExternalReturnFromDeeplink routes its own
        // failures; this only fires if that routing itself throws.
        Logger.error(error as Error, {
          message: 'handleRampReturnUrl: unhandled external return failure',
          rampReturnPath,
        });
      });
      return;
    }

    navigateToOrderDetails(orderId);
  } catch (error) {
    Logger.error(error as Error, {
      message: 'Error in handleRampReturnUrl',
      rampReturnPath,
    });
  }
}

function navigateToOrderDetails(orderId: string | undefined): void {
  NavigationService.navigation.navigate(Routes.RAMP.RAMPS_ORDER_DETAILS, {
    orderId,
    showCloseButton: true,
  });
}

async function completeExternalReturnFromDeeplink({
  correlation,
  rampReturnPath,
  orderId,
  providerCodeFromPath,
}: {
  correlation: ExternalReturnCorrelation;
  rampReturnPath: string;
  orderId: string | undefined;
  providerCodeFromPath: string | undefined;
}): Promise<void> {
  // Reconstruct the full deeplink so the shared resolver
  // (`RampsController.getOrderFromCallback`) sees the same URL shape the
  // provider redirected to.
  const returnUrl = `metamask://on-ramp${
    rampReturnPath.startsWith('/') ? '' : '/'
  }${rampReturnPath}`;

  try {
    const order = await completeHeadlessExternalReturn({
      sessionId: correlation.sessionId,
      providerCode: providerCodeFromPath ?? correlation.providerCode,
      walletAddress: correlation.walletAddress,
      returnUrl,
      orderIdFallback: orderId ?? correlation.orderId,
    });
    if (order === null) {
      // Another path (iOS openAuth resolution or a concurrent deeplink)
      // already completed this session; nothing to do.
      return;
    }
    // The Android/system-browser leg leaves the transparent HEADLESS_ENTRY
    // overlay mounted while awaiting this return; pop it now that the
    // session is complete so the consumer's screen is interactive. The
    // session-id check keeps a NEWER session's overlay untouched.
    dismissHeadlessEntryFromRoot(
      NavigationService.navigation,
      correlation.sessionId,
    );
  } catch (error) {
    Logger.error(error as Error, {
      message: 'handleRampReturnUrl: failed to resolve external browser return',
      rampReturnPath,
    });
    const liveSession = getSession(correlation.sessionId);
    if (liveSession) {
      // Technical failure with a live session: report it terminally
      // (P2.M7 QUOTE_FAILED) and tear the overlay down.
      emitExternalOrderFailed(correlation, error);
      clearExternalReturnCorrelation(correlation.sessionId);
      failSession(correlation.sessionId, error, 'QUOTE_FAILED');
      dismissHeadlessEntryFromRoot(
        NavigationService.navigation,
        correlation.sessionId,
      );
      return;
    }
    // No live session and no recoverable success: fall back to the
    // order-details screen, which can resolve/poll with whatever the
    // deeplink carried — same terminal UI as the non-headless flow.
    clearExternalReturnCorrelation(correlation.sessionId);
    navigateToOrderDetails(orderId);
  }
}
