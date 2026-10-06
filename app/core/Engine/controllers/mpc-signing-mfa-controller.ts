import {
  BaseController,
  type ControllerGetStateAction,
  type ControllerStateChangeEvent,
  type StateMetadata,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';
import { v4 as uuidv4 } from 'uuid';

const controllerName = 'MpcSigningMfaController';

export interface MpcSigningMfaControllerState {
  pendingMpcSigningMfaRequestId: string | null;
}

export function getDefaultMpcSigningMfaControllerState(): MpcSigningMfaControllerState {
  return {
    pendingMpcSigningMfaRequestId: null,
  };
}

const controllerMetadata: StateMetadata<MpcSigningMfaControllerState> = {
  pendingMpcSigningMfaRequestId: {
    includeInDebugSnapshot: true,
    includeInStateLogs: false,
    persist: false,
    usedInUi: true,
  },
};

export interface MpcSigningMfaControllerRequestSigningConfirmationAction {
  type: `${typeof controllerName}:requestSigningConfirmation`;
  handler: MpcSigningMfaController['requestSigningConfirmation'];
}

export interface MpcSigningMfaControllerAcceptSigningConfirmationAction {
  type: `${typeof controllerName}:acceptSigningConfirmation`;
  handler: MpcSigningMfaController['acceptSigningConfirmation'];
}

export interface MpcSigningMfaControllerRejectSigningConfirmationAction {
  type: `${typeof controllerName}:rejectSigningConfirmation`;
  handler: MpcSigningMfaController['rejectSigningConfirmation'];
}

export type MpcSigningMfaControllerGetStateAction = ControllerGetStateAction<
  typeof controllerName,
  MpcSigningMfaControllerState
>;

export type MpcSigningMfaControllerActions =
  | MpcSigningMfaControllerGetStateAction
  | MpcSigningMfaControllerRequestSigningConfirmationAction
  | MpcSigningMfaControllerAcceptSigningConfirmationAction
  | MpcSigningMfaControllerRejectSigningConfirmationAction;

export type MpcSigningMfaControllerStateChangeEvent =
  ControllerStateChangeEvent<
    typeof controllerName,
    MpcSigningMfaControllerState
  >;

export type MpcSigningMfaControllerMessenger = Messenger<
  typeof controllerName,
  MpcSigningMfaControllerActions,
  MpcSigningMfaControllerStateChangeEvent
>;

interface PendingConfirmation {
  id: string;
  resolve: () => void;
  reject: (error: Error) => void;
}

/**
 * Shows a confirmation while the MPC keyring waits for a signing MFA token.
 */
export class MpcSigningMfaController extends BaseController<
  typeof controllerName,
  MpcSigningMfaControllerState,
  MpcSigningMfaControllerMessenger
> {
  #pending: PendingConfirmation | null = null;

  constructor({
    messenger,
    state = {},
  }: {
    messenger: MpcSigningMfaControllerMessenger;
    state?: Partial<MpcSigningMfaControllerState>;
  }) {
    super({
      messenger,
      metadata: controllerMetadata,
      name: controllerName,
      state: {
        ...getDefaultMpcSigningMfaControllerState(),
        ...state,
      },
    });

    this.messenger.registerMethodActionHandlers(this, [
      'requestSigningConfirmation',
      'acceptSigningConfirmation',
      'rejectSigningConfirmation',
    ]);
  }

  /**
   * Block until the user confirms or cancels the signing MFA prompt.
   *
   * @returns Resolves when the user confirms.
   */
  async requestSigningConfirmation(): Promise<void> {
    if (this.#pending) {
      throw new Error('An MFA signing confirmation is already waiting');
    }

    const id = uuidv4();
    try {
      await new Promise<void>((resolve, reject) => {
        this.#pending = { id, resolve, reject };
        this.update((draft) => {
          draft.pendingMpcSigningMfaRequestId = id;
        });
      });
    } finally {
      this.#clearPending(id);
    }
  }

  #clearPending(id: string): void {
    if (this.#pending?.id !== id) {
      return;
    }

    this.#pending = null;
    this.update((draft) => {
      draft.pendingMpcSigningMfaRequestId = null;
    });
  }

  /**
   * Let the waiting signing request continue.
   */
  acceptSigningConfirmation(): void {
    this.#pending?.resolve();
  }

  /**
   * Cancel the waiting signing request.
   */
  rejectSigningConfirmation(): void {
    this.#pending?.reject(new Error('MFA signing confirmation was rejected'));
  }
}
