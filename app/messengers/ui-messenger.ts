import {
  Messenger,
  ActionConstraint,
  ExtractEventPayload,
  ExtractActionResponse,
  ExtractActionParameters,
} from '@metamask/messenger';
import type { Json } from '@metamask/utils';
import { MESSENGERS_WITH_EXCLUSIONS } from './configs';
import { captureException } from '@sentry/react-native';
import Engine, { GlobalActions, GlobalEvents } from '../core/Engine';

/**
 * All actions we call through the UI messenger will go through the background
 * connection and will therefore be asynchronous, even if they weren't
 * originally. This type makes a function asynchronous.
 */
type MakeAsynchronous<InputFunction extends (...args: never[]) => unknown> =
  InputFunction extends (...args: infer Args) => infer Return
    ? (...args: Args) => Promise<Awaited<Return>>
    : never;

/**
 * All actions we call through the UI messenger will go through the background
 * connection and will therefore be asynchronous, even if they weren't
 * originally. This type makes the given actions asynchronous.
 */
// Use a conditional type to ensure that TypeScript distributes a given union
// and we get a union back (this is essentially a `map`)
type MakeActionsAsynchronous<Action> = Action extends ActionConstraint
  ? { type: Action['type']; handler: MakeAsynchronous<Action['handler']> }
  : never;

const EXCLUDED_ACTIONS = MESSENGERS_WITH_EXCLUSIONS.flatMap(
  (config) => config.EXCLUDED_CAPABILITIES.actions,
);

type MessengerWithExclusions = (typeof MESSENGERS_WITH_EXCLUSIONS)[number];
type ExcludedActionTypes =
  MessengerWithExclusions['EXCLUDED_CAPABILITIES']['actions'][number];
type ExcludedEventTypes =
  MessengerWithExclusions['EXCLUDED_CAPABILITIES']['events'][number];

/**
 * Keeps only actions whose parameters and return value are JSON-serializable,
 * since all actions go through the background connection.
 */
type WithJsonParams<Action extends ActionConstraint> =
  Action extends ActionConstraint
    ? Parameters<Action['handler']> extends Json[]
      ? Action
      : never
    : never;

/**
 * Keeps only events whose payload is JSON-serializable, since all events come
 * through the background connection.
 */
type WithJsonPayload<Event> = Event extends {
  payload: infer P extends unknown[];
}
  ? P extends Json[]
    ? Event
    : never
  : never;

export type UIMessengerActions = MakeActionsAsynchronous<
  WithJsonParams<Exclude<GlobalActions, { type: ExcludedActionTypes }>>
>;

export type UIMessengerEvents = WithJsonPayload<
  Exclude<GlobalEvents, { type: ExcludedEventTypes }>
>;

const UI_MESSENGER_NAMESPACE = 'UI';

export class UIMessenger extends Messenger<
  typeof UI_MESSENGER_NAMESPACE,
  UIMessengerActions,
  UIMessengerEvents
> {
  constructor() {
    super({ namespace: UI_MESSENGER_NAMESPACE, captureException });
  }

  // @ts-expect-error This `call` is purposely not the same `call` from
  // `Messenger`.
  async call<ActionType extends UIMessengerActions['type']>(
    actionType: ActionType,
    ...params: ExtractActionParameters<UIMessengerActions, ActionType>
  ): Promise<Awaited<ExtractActionResponse<UIMessengerActions, ActionType>>> {
    const excludedActions: string[] = EXCLUDED_ACTIONS;
    const anyActionType: string = actionType;

    if (!excludedActions.includes(anyActionType)) {
      throw new Error(`Action '${actionType}' has not been exposed to the UI`);
    }

    // @ts-expect-error: Type of handler is not compatible.
    return await Engine.controllerMessenger.call(actionType, ...params);
  }

  /**
   * Subscribe to an event emitted by the background.
   *
   * Registers the given function as an event handler for the given event type.
   *
   * @param eventType - The event type. This is a unique identifier for this
   * event.
   * @param handler - The event handler. The type of the parameters for this
   * event handler must match the type of the payload for this event type.
   * @returns A cleanup function that can be invoked to unsubscribe.
   */
  // @ts-expect-error: Intentionally different type than `messenger.subscribe`.
  async subscribe<EventType extends UIMessengerEvents['type']>(
    eventType: EventType,
    handler: (
      ...payload: ExtractEventPayload<UIMessengerEvents, EventType>
    ) => void,
  ): Promise<() => Promise<void>> {
    // @ts-expect-error: Type of handler is not compatible.
    Engine.controllerMessenger.subscribe(eventType, handler);

    return async () => {
      // @ts-expect-error: Type of handler is not compatible.
      Engine.controllerMessenger.unsubscribe(eventType, handler);
    };
  }
}

/**
 * Factory function to create a UI messenger instance.
 *
 * @returns A new instance of the UI messenger.
 */
export function createUIMessenger(): UIMessenger {
  return new UIMessenger();
}
