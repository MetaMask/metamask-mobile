import type { INotification } from '@metamask/notification-services-controller/notification-services';
import type {
  ControllerMessenger,
  EngineContext,
  RootExtendedMessenger,
} from '../../types';
import { store } from '../../../../store';
import { buildAndTrackEvent } from '../../utils/analytics';
import Logger from '../../../../util/Logger';
import { MetaMetricsEvents } from '../../../Analytics';
import { markWalletFundsObtainedFlowComplete } from '../../../../actions/onboarding';
import {
  computeDaysSinceWalletCreation,
  getAssetSymbolFromReceiveNotification,
  getUsdAmountFromReceiveNotification,
  getWalletFundsObtainedSource,
  hasNonZeroMultichainBalance,
  hasNonZeroTokenBalance,
  isAboveWalletFundsObtainedThreshold,
  isCreatedWalletAccountType,
  pickOldestEthOrErc20Received,
  type EthOrErc20ReceivedNotification,
} from '../../../../util/analytics/wallet-funds-obtained';

const NOTIFICATIONS_UPDATED_EVENT =
  'NotificationServicesController:notificationsListUpdated' as const;

const NOTIFICATION_SERVICES_STATE_EVENT =
  'NotificationServicesController:stateChange' as const;

/**
 * Tracks the Segment "Wallet Funds Obtained" event once per wallet lifecycle when a
 * created (non-imported) wallet first receives a qualifying on-chain deposit, mirroring
 * the extension monitor with mobile-specific source classification and schema fields.
 */
export class WalletFundsObtainedMonitor {
  readonly #messenger: RootExtendedMessenger;

  readonly #getContext: () => EngineContext;

  #listenerSetup = false;

  #handleNotifications: ((notifications: INotification[]) => void) | null =
    null;

  #lastOnboardingSignature = '';

  /**
   * Set after the one-time "no on-chain balance" read when a monitoring session starts.
   * `#hasExistingFunds()` must not run on every `setupMonitoring` call: later updates (e.g.
   * dust that never produces a ≥$1 notification) could flip token/multichain state and
   * incorrectly call `#markFlowComplete()` without emitting the Segment event. Reset in
   * `#detachListSubscription()` so a new session (e.g. notifications re-enabled) re-runs the gate.
   */
  #initialExistingFundsCheckSatisfied = false;

  #storeUnsubscribe: (() => void) | undefined;

  readonly #onNotificationServicesStateChange = (): void => {
    this.setupMonitoring();
  };

  /**
   * @param options.messenger - Root engine messenger (delegates to notification + analytics actions).
   * @param options.getContext - Lazy engine context for controllers that are not messengers.
   */
  constructor(options: {
    messenger: RootExtendedMessenger;
    getContext: () => EngineContext;
  }) {
    this.#messenger = options.messenger;
    this.#getContext = options.getContext;

    this.#storeUnsubscribe = store.subscribe(() => {
      const o = store.getState().onboarding;
      const signature = `${o.completedOnboarding}|${o.walletFundsObtainedFlowComplete}|${o.walletCreatedAtForFundsTrackingMs ?? ''}|${o.accountType ?? ''}`;
      if (signature === this.#lastOnboardingSignature) {
        return;
      }
      this.#lastOnboardingSignature = signature;
      this.setupMonitoring();
    });

    this.#messenger.subscribe(
      NOTIFICATION_SERVICES_STATE_EVENT,
      this.#onNotificationServicesStateChange,
    );
  }

  /**
   * Detaches Redux / messenger hooks. Call before `controllerMessenger.clearSubscriptions()`.
   */
  destroy(): void {
    this.#storeUnsubscribe?.();
    this.#storeUnsubscribe = undefined;
    try {
      this.#messenger.unsubscribe(
        NOTIFICATION_SERVICES_STATE_EVENT,
        this.#onNotificationServicesStateChange,
      );
    } catch {
      // Messenger may already be torn down
    }
    this.#detachListSubscription();
  }

  #hasExistingFunds(): boolean {
    try {
      const { TokenBalancesController } = this.#getContext();
      const tokenBalancesState = TokenBalancesController.state;

      if (hasNonZeroTokenBalance(tokenBalancesState.tokenBalances)) {
        return true;
      }

      const multichain = this.#getContext().MultichainBalancesController;
      if (multichain) {
        return hasNonZeroMultichainBalance(multichain.state.balances);
      }
      return false;
    } catch (error) {
      Logger.error(error as Error, {
        message: 'WalletFundsObtainedMonitor: error checking existing funds',
      });
      return false;
    }
  }

  #detachListSubscription(): void {
    if (this.#handleNotifications) {
      this.#messenger.unsubscribe(
        NOTIFICATIONS_UPDATED_EVENT,
        this.#handleNotifications,
      );
      this.#handleNotifications = null;
    }
    this.#listenerSetup = false;
    this.#initialExistingFundsCheckSatisfied = false;
  }

  #markFlowComplete(): void {
    store.dispatch(markWalletFundsObtainedFlowComplete());
    this.#detachListSubscription();
  }

  #trackFromNotification(notification: EthOrErc20ReceivedNotification): void {
    const chainId = notification.payload.chain_id;
    const amountUsdRaw = getUsdAmountFromReceiveNotification(notification);

    if (!chainId || !amountUsdRaw) {
      return;
    }

    if (!isAboveWalletFundsObtainedThreshold(amountUsdRaw)) {
      return;
    }

    const onboarding = store.getState().onboarding;
    const walletCreatedAtMs = onboarding.walletCreatedAtForFundsTrackingMs;
    if (walletCreatedAtMs === undefined) {
      return;
    }

    const { RampsController } = this.#getContext();
    const source = getWalletFundsObtainedSource(
      notification,
      RampsController.state.orders,
    );

    const fundingAmountUsd = Number(amountUsdRaw);
    const assetSymbol = getAssetSymbolFromReceiveNotification(notification);

    buildAndTrackEvent(
      this.#messenger as unknown as ControllerMessenger,
      MetaMetricsEvents.WALLET_FUNDS_OBTAINED,
      {
        source,
        chain_id: chainId,
        asset_symbol: assetSymbol,
        funding_amount_usd: fundingAmountUsd,
        days_since_creation: computeDaysSinceWalletCreation(walletCreatedAtMs),
      },
    );

    this.#markFlowComplete();
  }

  #createNotificationHandler() {
    return (notifications: INotification[]) => {
      const lastNotification = pickOldestEthOrErc20Received(notifications);
      if (!lastNotification) {
        return;
      }
      this.#trackFromNotification(lastNotification);
    };
  }

  /**
   * Subscribes to notification list updates when this wallet is eligible for the one-time event.
   */
  setupMonitoring(): void {
    const onboarding = store.getState().onboarding;

    if (onboarding.walletFundsObtainedFlowComplete) {
      this.#detachListSubscription();
      return;
    }

    if (!onboarding.completedOnboarding) {
      this.#detachListSubscription();
      return;
    }

    if (!isCreatedWalletAccountType(onboarding.accountType)) {
      this.#detachListSubscription();
      return;
    }

    if (onboarding.walletCreatedAtForFundsTrackingMs === undefined) {
      this.#detachListSubscription();
      return;
    }

    const { NotificationServicesController } = this.#getContext();
    if (!NotificationServicesController.state.isNotificationServicesEnabled) {
      this.#detachListSubscription();
      return;
    }

    if (!this.#initialExistingFundsCheckSatisfied) {
      if (this.#hasExistingFunds()) {
        this.#markFlowComplete();
        return;
      }
      this.#initialExistingFundsCheckSatisfied = true;
    }

    if (!this.#listenerSetup) {
      this.#handleNotifications = this.#createNotificationHandler();
      this.#messenger.subscribe(
        NOTIFICATIONS_UPDATED_EVENT,
        this.#handleNotifications,
      );
      this.#listenerSetup = true;
    }

    if (this.#handleNotifications) {
      this.#handleNotifications(
        NotificationServicesController.state.metamaskNotificationsList,
      );
    }
  }
}
