import {
  BaseController,
  type ControllerGetStateAction,
  type ControllerStateChangedEvent,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';

export const GACHA_CONTROLLER_NAME = 'GachaController';

export type GachaControllerState = Record<string, never>;

/**
 * Creates the initial state of the Gacha feature.
 *
 * @returns An empty state until the module's business logic is implemented.
 */
export const getDefaultGachaControllerState = (): GachaControllerState => ({});

export type GachaControllerActions = ControllerGetStateAction<
  typeof GACHA_CONTROLLER_NAME,
  GachaControllerState
>;

export type GachaControllerEvents = ControllerStateChangedEvent<
  typeof GACHA_CONTROLLER_NAME,
  GachaControllerState
>;

export type GachaControllerMessenger = Messenger<
  typeof GACHA_CONTROLLER_NAME,
  GachaControllerActions,
  GachaControllerEvents
>;

/** Gacha state and Engine lifecycle scaffold. */
export class GachaController extends BaseController<
  typeof GACHA_CONTROLLER_NAME,
  GachaControllerState,
  GachaControllerMessenger
> {
  constructor({ messenger }: { messenger: GachaControllerMessenger }) {
    super({
      name: GACHA_CONTROLLER_NAME,
      metadata: {},
      messenger,
      state: getDefaultGachaControllerState(),
    });
  }

  /** Resets the module when Engine resets the wallet. */
  clearState(): void {
    this.update(() => getDefaultGachaControllerState());
  }
}
