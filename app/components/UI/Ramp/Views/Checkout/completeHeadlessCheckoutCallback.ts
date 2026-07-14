import type { RampsOrder } from '@metamask/ramps-controller';
import type { Dispatch, UnknownAction } from 'redux';
import { protectWalletModalVisible } from '../../../../../actions/user';
import {
  emitOrderConfirmedAnalyticsFromCallback,
  emitTerminalOrderAnalyticsFromCallback,
  isTerminalOrderStatus,
} from '../../../../../core/Engine/controllers/ramps-controller/event-handlers/analytics';
import { setHeadlessOrderContext } from '../../../../../core/Engine/controllers/ramps-controller/headlessOrderContextRegistry';
import Logger from '../../../../../util/Logger';
import { closeSession } from '../../headless/sessionRegistry';
import type { HeadlessSession } from '../../headless/types';
import type { RampSurface } from '../../types/depositAnalytics';

export type CompleteHeadlessCheckoutCallbackParams = {
  headlessSessionId: string | undefined;
  session: HeadlessSession | null | undefined;
  providerCode: string;
  callbackUrl: string;
  walletAddress: string;
  headlessRampSurface: RampSurface | undefined;
  regionCode: string | undefined;
  getOrderFromCallback: (
    providerCode: string,
    callbackUrl: string,
    walletAddress: string,
  ) => Promise<RampsOrder>;
  addOrder: (order: RampsOrder) => void;
  dispatch: Dispatch<UnknownAction>;
  dismissActiveHeadlessFlow: () => void;
  onHeadlessSessionTerminated: () => void;
  onCallbackSuccessCloseSource: () => void;
};

/**
 * Headless checkout callback: fetch order, emit mid/terminal analytics, notify
 * consumer, and tear down the session. Returns true when the headless branch ran.
 */
export async function completeHeadlessCheckoutCallback({
  headlessSessionId,
  session,
  providerCode,
  callbackUrl,
  walletAddress,
  headlessRampSurface,
  regionCode,
  getOrderFromCallback,
  addOrder,
  dispatch,
  dismissActiveHeadlessFlow,
  onHeadlessSessionTerminated,
  onCallbackSuccessCloseSource,
}: CompleteHeadlessCheckoutCallbackParams): Promise<boolean> {
  if (!headlessSessionId || !session) {
    return false;
  }

  const rampsOrder = await getOrderFromCallback(
    providerCode,
    callbackUrl,
    walletAddress,
  );
  if (!rampsOrder) {
    throw new Error('Order could not be retrieved from callback');
  }
  addOrder(rampsOrder);

  // TRAM-3623/3691: carry headless context for terminal RAMPS_TRANSACTION_FAILED.
  setHeadlessOrderContext(rampsOrder.providerOrderId, {
    rampSurface: headlessRampSurface,
    region: regionCode ?? '',
  });

  // TRAM-3738 / TRAM-3691: headless callback skips OrderDetails.
  if (isTerminalOrderStatus(rampsOrder.status)) {
    emitTerminalOrderAnalyticsFromCallback(rampsOrder);
  } else {
    emitOrderConfirmedAnalyticsFromCallback(rampsOrder, {
      rampType: 'HEADLESS',
      rampSurface: headlessRampSurface,
      region: regionCode,
    });
  }

  dispatch(protectWalletModalVisible());
  try {
    session.callbacks.onOrderCreated(rampsOrder.providerOrderId);
  } catch (callbackError) {
    Logger.error(
      callbackError as Error,
      'UnifiedCheckout: onOrderCreated callback threw',
    );
  }
  onHeadlessSessionTerminated();
  closeSession(headlessSessionId, { reason: 'completed' });
  onCallbackSuccessCloseSource();
  dismissActiveHeadlessFlow();
  return true;
}
