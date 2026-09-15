import {
  ActionConstraint,
  Messenger,
  EventConstraint,
  ExtractEventHandler,
} from '@metamask/messenger';

const SUBSCRIPTION_NOT_FOUND_PREFIX = 'Subscription not found for event:';

/**
 * TEMP perf-debug switches for the wallet-unlock JS-thread spike.
 * Set a controller to false to stop its unlock listeners while leaving every other
 * controller untouched. Remove this block before merging.
 */
export const PERF_DEBUG_UNLOCK_LISTENERS: Record<string, boolean> = {
  AccountTrackerController: true,
  AssetsController: true,
  AuthenticationController: true, //One of the root causes UNBLOCKED
  BackendWebSocketService: true,
  CardController: true,
  ConfigRegistryController: true,
  MoneyAccountUpgradeControllerInitialization: true,
  MultichainAssetsRatesController: true,
  NetworkConnectionBannerController: true,
  NotificationServicesController: true,
  PermissionControllerInit: true,
  ProfileMetricsController: true,
  RewardsController: true,
  Root: true,
  SnapAccountService: true,
  SnapControllerInit: true,
  TokenBalancesController: true,
  TokenDetectionController: true,
  TransactionControllerInit: true,
  UserStorageController: true,
};

const PERF_DEBUG_EVENT_TYPE = 'KeyringController:unlock';
const PERF_DEBUG_NAMESPACE_PROBE = 'PERF_DEBUG:namespaceProbe';

type UntypedPublishDelegated = (
  this: object,
  eventType: string,
  ...payload: unknown[]
) => void;
type UntypedUnregisterActionHandler = (
  this: object,
  actionType: string,
) => void;

/* eslint-disable @typescript-eslint/no-deprecated -- Temporary perf debugging requires intercepting delegated events. */
const originalPublishDelegated = Messenger.prototype
  ._internalPublishDelegated as unknown as UntypedPublishDelegated;
const originalUnregisterActionHandler = Messenger.prototype
  .unregisterActionHandler as unknown as UntypedUnregisterActionHandler;

const messengerNamespaces = new WeakMap<object, string>();

const getMessengerNamespace = (messenger: object): string => {
  const cachedNamespace = messengerNamespaces.get(messenger);
  if (cachedNamespace) {
    return cachedNamespace;
  }

  try {
    originalUnregisterActionHandler.call(messenger, PERF_DEBUG_NAMESPACE_PROBE);
  } catch (error) {
    const namespace =
      error instanceof Error
        ? error.message.match(/prefixed by '([^']+):'/u)?.[1]
        : undefined;
    if (namespace) {
      messengerNamespaces.set(messenger, namespace);
      return namespace;
    }
  }

  return 'Unknown';
};

(Messenger.prototype
  ._internalPublishDelegated as unknown as UntypedPublishDelegated) =
  function patchedPublishDelegated(eventType: string, ...payload: unknown[]) {
    if (eventType === PERF_DEBUG_EVENT_TYPE) {
      const namespace = getMessengerNamespace(this);
      if (PERF_DEBUG_UNLOCK_LISTENERS[namespace] === false) {
        // eslint-disable-next-line no-console
        console.log(`[PERF_DEBUG] Blocked unlock listeners: ${namespace}`);
        return;
      }
    }

    return originalPublishDelegated.call(this, eventType, ...payload);
  };
/* eslint-enable @typescript-eslint/no-deprecated */

export class ExtendedMessenger<
  Namespace extends string,
  Action extends ActionConstraint = never,
  Event extends EventConstraint = never,
  Parent extends Messenger<
    string,
    ActionConstraint,
    EventConstraint,
    // Use `any` to avoid preventing a parent from having a parent. `any` is harmless in a type
    // constraint anyway, it's the one totally safe place to use it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  > = never,
> extends Messenger<Namespace, Action, Event, Parent> {
  subscribeOnceIf<EventType extends Event['type']>(
    eventType: EventType,
    handler: ExtractEventHandler<Event, EventType>,
    criteria: (
      ...args: Parameters<ExtractEventHandler<Event, EventType>>
    ) => boolean,
  ): typeof handler {
    const internalHandler = ((...data: Parameters<typeof handler>) => {
      if (!criteria || criteria(...data)) {
        this.tryUnsubscribe(eventType, internalHandler);
        handler(...data);
      }
    }) as typeof handler;

    this.subscribe(eventType, internalHandler);

    return internalHandler;
  }

  tryUnsubscribe<EventType extends Event['type']>(
    eventType: EventType,
    handler?: ExtractEventHandler<Event, EventType>,
  ) {
    if (!handler) {
      return;
    }

    try {
      this.unsubscribe(eventType, handler);
    } catch (e) {
      // Ignore
    }
  }
}
