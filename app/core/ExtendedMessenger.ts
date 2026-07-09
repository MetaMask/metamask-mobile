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

  /**
   * Build a child messenger scoped to a given namespace with restricted
   * actions and events. The child messenger routes calls to the parent
   * (this messenger) at runtime.
   *
   * This mirrors the old `ControllerMessenger.buildRestricted()` API from
   * `@metamask/base-controller` and provides a typed entry-point for callers
   * that need a narrowed messenger without re-writing the parent constraint.
   *
   * @param options - Options for the child messenger.
   * @param options.namespace - Namespace for the child messenger.
   * @param options.actions - Allowed action types for the child.
   * @param options.events - Allowed event types for the child.
   * @returns A new child messenger scoped to the given namespace.
   */
  buildChild<
    N extends string,
    A extends ActionConstraint,
    E extends EventConstraint,
  >(_options: {
    namespace: N;
    actions: A['type'][];
    events: E['type'][];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): Messenger<N, A, E, any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Messenger<N, A, E, any>({
      namespace: _options.namespace,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parent: this as any,
    });
  }
}
