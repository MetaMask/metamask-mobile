import {
  ActionConstraint,
  Messenger,
  EventConstraint,
  ExtractEventHandler,
} from '@metamask/messenger';

const SUBSCRIPTION_NOT_FOUND_PREFIX = 'Subscription not found for event:';

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

  /**
   * Override unsubscribe to be tolerant of missing subscriptions.
   * When a subscription was already removed (e.g. by another cleanup or controller teardown),
   * the base Messenger throws. This avoids crashing components that call unsubscribe in cleanup.
   */
  override unsubscribe<EventType extends Event['type']>(
    eventType: EventType,
    handler: ExtractEventHandler<Event, EventType>,
  ): void {
    try {
      super.unsubscribe(eventType, handler);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (!message.startsWith(SUBSCRIPTION_NOT_FOUND_PREFIX)) {
        throw e;
      }
      // Subscription already gone; no-op for cleanup tolerance.
    }
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
