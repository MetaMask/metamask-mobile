import {
  AccountsControllerGetSelectedAccountAction,
  AccountsControllerSelectedAccountChangeEvent,
} from '@metamask/accounts-controller';
import {
  BaseController,
  ControllerGetStateAction,
  ControllerStateChangeEvent,
  RestrictedMessenger,
} from '@metamask/base-controller';
import { Json } from '@metamask/utils';

const controllerName = 'AlertController';

enum Web3ShimUsageAlertStates {
  recorded = 1,
  dismissed = 2,
}

enum AlertTypes {
  unconnectedAccount = 'unconnectedAccount',
  web3ShimUsage = 'web3ShimUsage',
  invalidCustomNetwork = 'invalidCustomNetwork',
  smartTransactionsMigration = 'smartTransactionsMigration',
}

/**
 * Alerts that can be enabled or disabled by the user.
 */
const TOGGLEABLE_ALERT_TYPES = [
  AlertTypes.unconnectedAccount,
  AlertTypes.web3ShimUsage,
  AlertTypes.smartTransactionsMigration,
];

/**
 * Returns the state of the {@link AlertController}.
 */
type AlertControllerGetStateAction = ControllerGetStateAction<
  typeof controllerName,
  Record<string, Json>
>;

/**
 * Actions exposed by the {@link AlertController}.
 */
type AlertControllerActions = AlertControllerGetStateAction;

/**
 * Event emitted when the state of the {@link AlertController} changes.
 */
type AlertControllerStateChangeEvent = ControllerStateChangeEvent<
  typeof controllerName,
  Record<string, Json>
>;

/**
 * Events emitted by {@link AlertController}.
 */
type AlertControllerEvents = AlertControllerStateChangeEvent;

/**
 * Actions that this controller is allowed to call.
 */
type AllowedActions = AccountsControllerGetSelectedAccountAction;

/**
 * Events that this controller is allowed to subscribe.
 */
type AllowedEvents = AccountsControllerSelectedAccountChangeEvent;

type AlertControllerMessenger = RestrictedMessenger<
  typeof controllerName,
  AlertControllerActions | AllowedActions,
  AlertControllerEvents | AllowedEvents,
  AllowedActions['type'],
  AllowedEvents['type']
>;

/**
 * The alert controller state type
 *
 * @property alertEnabledness - A map of alerts IDs to booleans, where
 * `true` indicates that the alert is enabled and shown, and `false` the opposite.
 * @property unconnectedAccountAlertShownOrigins - A map of origin
 * strings to booleans indicating whether the "switch to connected" alert has
 * been shown (`true`) or otherwise (`false`).
 */
interface AlertControllerState {
  alertEnabledness: Record<string, boolean>;
  unconnectedAccountAlertShownOrigins: Record<string, boolean>;
  web3ShimUsageOrigins?: Record<string, number>;
}

/**
 * The alert controller options
 *
 * @property state - The initial controller state
 * @property messenger - The controller messenger
 */
interface AlertControllerOptions {
  state?: Partial<AlertControllerState>;
  messenger: AlertControllerMessenger;
}

/**
 * Function to get default state of the {@link AlertController}.
 */
export const getDefaultAlertControllerState = (): AlertControllerState => ({
  alertEnabledness: TOGGLEABLE_ALERT_TYPES.reduce(
    (alertEnabledness: Record<string, boolean>, alertType: string) => {
      alertEnabledness[alertType] = true;
      return alertEnabledness;
    },
    {},
  ),
  unconnectedAccountAlertShownOrigins: {},
  web3ShimUsageOrigins: {},
});

/**
 * {@link AlertController}'s metadata.
 *
 * This allows us to choose if fields of the state should be persisted or not
 * using the `persist` flag; and if they can be sent to Sentry or not, using
 * the `anonymous` flag.
 */
const controllerMetadata = {
  alertEnabledness: {
    persist: true,
    anonymous: true,
  },
  unconnectedAccountAlertShownOrigins: {
    persist: true,
    anonymous: false,
  },
  web3ShimUsageOrigins: {
    persist: true,
    anonymous: false,
  },
};

/**
 * Controller responsible for maintaining alert-related state.
 */
export class AlertController extends BaseController<
  typeof controllerName,
  Record<string, Json>,
  AlertControllerMessenger
> {
  #selectedAddress: string;

  constructor(opts: AlertControllerOptions) {
    super({
      messenger: opts.messenger,
      metadata: controllerMetadata,
      name: controllerName,
      state: {
        ...getDefaultAlertControllerState(),
        ...opts.state,
      },
    });

    this.#selectedAddress = this.messagingSystem.call(
      'AccountsController:getSelectedAccount',
    ).address;

    this.messagingSystem.subscribe(
      'AccountsController:selectedAccountChange',
      (account: { address: string }) => {
        const currentState = this.state;
        if (
          currentState.unconnectedAccountAlertShownOrigins &&
          this.#selectedAddress !== account.address
        ) {
          this.#selectedAddress = account.address;
          this.update((state) => {
            state.unconnectedAccountAlertShownOrigins = {};
          });
        }
      },
    );
  }

  /**
   * Gets the web3 shim usage state for the given origin.
   *
   * @param origin - The origin to get the web3 shim usage state for.
   * @returns The web3 shim usage state for the given
   * origin, or undefined.
   */
  getWeb3ShimUsageState(origin: string): number | undefined {
    //@ts-expect-error //TODO: [ffmcgee] cba
    return this.state.web3ShimUsageOrigins?.[origin];
  }

  /**
   * Sets the web3 shim usage state for the given origin to RECORDED.
   *
   * @param origin - The origin the that used the web3 shim.
   */
  setWeb3ShimUsageRecorded(origin: string): void {
    this.update((state) => {
      //@ts-expect-error //TODO: [ffmcgee] type instantiation extensively deep and possibly infinite.
      if (state.web3ShimUsageOrigins) {
        state.web3ShimUsageOrigins[origin] = Web3ShimUsageAlertStates.recorded;
      }
    });
  }

  /**
   * Sets the web3 shim usage state for the given origin to DISMISSED.
   *
   * @param origin - The origin that the web3 shim notification was
   * dismissed for.
   */
  setWeb3ShimUsageAlertDismissed(origin: string): void {
    this.update((state) => {
      if (state.web3ShimUsageOrigins) {
        state.web3ShimUsageOrigins[origin] = Web3ShimUsageAlertStates.dismissed;
      }
    });
  }
}
