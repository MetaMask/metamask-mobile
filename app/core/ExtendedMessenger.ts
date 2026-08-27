import {
  ActionConstraint,
  Messenger,
  EventConstraint,
  ExtractEventHandler,
} from '@metamask/messenger';

const SUBSCRIPTION_NOT_FOUND_PREFIX = 'Subscription not found for event:';

/**
 * TEMP perf-debug switch for manual binary search on wallet-unlock JS-thread spike.
 * When true, blocks the listed events from reaching ANY subscriber (dozens of
 * controllers/services across Engine subscribe to 'KeyringController:unlock' to
 * kick off polling/fetch/init work right after unlock). Flip to true to confirm the
 * "unlock storm" hypothesis in one shot; remove items from the Set to bisect which
 * specific controller's unlock-triggered work is the culprit. Remove this block
 * before merging.
 *
 * NOTE: this must patch `Messenger.prototype.publish` directly (not just override
 * it on the `ExtendedMessenger` subclass) because `Messenger.buildChild()` hardcodes
 * `new Messenger(...)` for every child/restricted messenger it creates — i.e. every
 * individual controller's own messenger is a plain base `Messenger` instance, not an
 * `ExtendedMessenger`, so a subclass-only override never sees their `publish` calls.
 */
// THis is causing a massive upgrade after the initial load, there is mountains that are big after the initial one
export const PERF_DEBUG_BLOCK_EVENTS = true;
const PERF_DEBUG_BLOCKED_EVENT_TYPES = new Set<string>([
  'KeyringController:unlock',
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const originalMessengerPublish = (Messenger.prototype as any).publish;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Messenger.prototype as any).publish = function patchedPublish(
  eventType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...payload: any[]
) {
  if (PERF_DEBUG_BLOCKED_EVENT_TYPES.has(eventType)) {
    // eslint-disable-next-line no-console
    console.log(
      `[PERF_DEBUG] publish('${eventType}') reached the patched Messenger.prototype.publish — blocked=${PERF_DEBUG_BLOCK_EVENTS}`,
    );
    if (PERF_DEBUG_BLOCK_EVENTS) {
      return undefined;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-invalid-this
  return originalMessengerPublish.call(this, eventType, ...payload);
};

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
