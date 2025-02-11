import {
  ActionConstraint,
  Messenger,
  EventConstraint,
  ExtractEventHandler,
} from '@metamask/base-controller';

export class ExtendedControllerMessenger<
  Action extends ActionConstraint,
  Event extends EventConstraint,
> extends Messenger<Action, Event> {
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
