import {
  Messenger,
  ActionConstraint,
  ExtractEventPayload,
} from '@metamask/messenger';
import type { Json } from '@metamask/utils';
import { MESSENGERS_WITH_EXCLUSIONS } from './configs';
import { captureException } from '@sentry/react-native';
import Engine, { GlobalActions, GlobalEvents } from '../core/Engine';

/**
 * All actions are made asynchronous to match the implementation of the
 * extension, which routes all actions through the background connection. This
 * type makes a function asynchronous.
 */
type MakeAsynchronous<InputFunction extends (...args: never[]) => unknown> =
  InputFunction extends (...args: infer Args) => infer Return
    ? (...args: Args) => Promise<Awaited<Return>>
    : never;

/**
 * All actions are made asynchronous to match the implementation of the
 * extension, which routes all actions through the background connection. This
 * type makes the given actions asynchronous.
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
 * to match the implementation of the extension.
 */
type WithJsonParams<Action extends ActionConstraint> =
  Action extends ActionConstraint
    ? Parameters<Action['handler']> extends Json[]
      ? Action
      : never
    : never;

/**
 * Keeps only events whose payload is JSON-serializable, to match the
 * implementation of the extension.
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

  /**
   * Get the handler for a given action type.
   *
   * This is called when `call` is invoked on the messenger. We override it here
   * to match the implementation of the extension.
   *
   * @param actionType - The action type. This is a unique identifier for this
   * action.
   * @returns The handler for this action type, or undefined if this action type
   * is excluded or not found.
   */
  protected override getAction(
    actionType: UIMessengerActions['type'],
  ): ActionConstraint['handler'] | undefined {
    const excludedActions: string[] = EXCLUDED_ACTIONS;
    const anyActionType: string = actionType;

    if (excludedActions.includes(anyActionType)) {
      throw new Error(
        `The action "${actionType}" has not been exposed to the UI.`,
      );
    }

    return (...args: unknown[]) =>
      // @ts-expect-error: `unknown[]` is not assignable to `args`, but the type
      // here is checked in `call`, so this is safe.
      Engine.controllerMessenger.call(actionType, ...args);
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
  ): Promise<void> {
    // @ts-expect-error: Type of handler is not compatible.
    Engine.controllerMessenger.subscribe(eventType, handler);
  }

  /**
   * Unsubscribe from an event emitted by the background.
   *
   * Unregisters the given function as an event handler for the given event
   * type.
   *
   * @param eventType - The event type. This is a unique identifier for this
   * event.
   * @param handler - The event handler to remove. The type of the parameters
   * for this event handler must match the type of the payload for this event
   * type.
   * @returns A promise that resolves when the unsubscription is complete.
   */
  // @ts-expect-error: Intentionally different type than `messenger.unsubscribe`.
  async unsubscribe<EventType extends UIMessengerEvents['type']>(
    eventType: EventType,
    handler: (
      ...payload: ExtractEventPayload<UIMessengerEvents, EventType>
    ) => void,
  ): Promise<void> {
    // @ts-expect-error: Type of handler is not compatible.
    Engine.controllerMessenger.unsubscribe(eventType, handler);
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
