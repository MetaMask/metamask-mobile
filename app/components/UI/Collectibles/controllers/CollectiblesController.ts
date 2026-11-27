import {
  BaseController,
  type ControllerGetStateAction,
  type ControllerStateChangedEvent,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';

export const COLLECTIBLES_CONTROLLER_NAME = 'CollectiblesController';

export type CollectiblesControllerState = Record<string, never>;

/**
 * Creates the initial state of the Collectibles feature.
 *
 * @returns An empty state until the module's business logic is implemented.
 */
export const getDefaultCollectiblesControllerState =
  (): CollectiblesControllerState => ({});

export type CollectiblesControllerActions = ControllerGetStateAction<
  typeof COLLECTIBLES_CONTROLLER_NAME,
  CollectiblesControllerState
>;

export type CollectiblesControllerEvents = ControllerStateChangedEvent<
  typeof COLLECTIBLES_CONTROLLER_NAME,
  CollectiblesControllerState
>;

export type CollectiblesControllerMessenger = Messenger<
  typeof COLLECTIBLES_CONTROLLER_NAME,
  CollectiblesControllerActions,
  CollectiblesControllerEvents
>;

/** Collectibles state and Engine lifecycle scaffold. */
export class CollectiblesController extends BaseController<
  typeof COLLECTIBLES_CONTROLLER_NAME,
  CollectiblesControllerState,
  CollectiblesControllerMessenger
> {
  constructor({
    messenger,
    state = getDefaultCollectiblesControllerState(),
  }: {
    messenger: CollectiblesControllerMessenger;
    state?: Partial<CollectiblesControllerState>;
  }) {
    super({
      name: COLLECTIBLES_CONTROLLER_NAME,
      metadata: {},
      messenger,
      // Engine supplies partial persisted state. With no declared fields yet,
      // there are no defaults to merge; retain the standard hydration contract.
      // Replace this assertion with a default-state merge when fields are added.
      state: state as CollectiblesControllerState,
    });
  }

  /** Resets the module when Engine resets the wallet. */
  clearState(): void {
    this.update(() => getDefaultCollectiblesControllerState());
  }
}
