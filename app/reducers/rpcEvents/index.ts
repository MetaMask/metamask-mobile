/**
 * This reducer to used to record the lifecycle stage from RPC calls so that UI can subscribe to it and display or change UI behaviour corresponding based on that stage information.
 *
 * the current available stage has been defined in RPCStageTypes enum, please extend it if you need more stages.
 *
 * Some similar RPC calls will be grouped into the same event group, for example, eth_sign, personal_sign, eth_signTypedData, eth_signTypedData_v3,
 * eth_signTypedData_v4 will be grouped into signingEvent group so that the UI can handle all similar RPC calls in the same way. Please refer to rpcToEventGroupMap for more details.
 *
 * rpcToEventGroupMap will be also used by RPCMiddleware to check whether RPC is whitelisted to track the event stage.
 * if you want to track proticular RPC event stage which is not in whitelist, please add it to rpcToEventGroupMap.
 * if your RPC didn't belong to any event group, just use RPC name as event group name for that RPC. (**Causion**: please make sure the RPC name is unique)
 */

import { ActionType, iEventAction } from '../../actions/rpcEvents';

/**
 * Mapping of RPC name to supported event group name
 */
const rpcToEventGroupMap = new Map([
  ['eth_sign', 'signingEvent'],
  ['personal_sign', 'signingEvent'],
  ['eth_signTypedData', 'signingEvent'],
  ['eth_signTypedData_v3', 'signingEvent'],
  ['eth_signTypedData_v4', 'signingEvent'],
]);

/**
 * check if the rpcName is whitelisted to track the event stage.
 * @param {string} rpcName - the rpc name which fires the event
 * @returns {boolean} - true if the rpcName is whitelisted
 */
export const isWhitelistedRPC = (rpcName: string): boolean =>
  rpcToEventGroupMap.has(rpcName);

/**
 * Deference stage in RPC flow
 */
export enum RPCStageTypes {
  IDLE = 'idle',
  REQUEST_SEND = 'request_send',
  COMPLETE = 'complete',
  ERROR = 'error',
}

/**
 * Defined the event stage properties to be stored in store
 * Different event group will have different eventStage
 * @param {string} eventStage - the current stage of the event flow
 * @param {string} rpcName - the RPC name which fires the event
 * @param {Error | unknown} error - optional error object to be set in store
 */
export interface iEventStage {
  eventStage: string;
  rpcName: string;
  error?: Error;
}

/**
 * Interface for defining what properties will be defined in store
 * please extend this interface to add more supported RPC events
 */
export interface iEventGroup {
  signingEvent: iEventStage;
}

/**
 * Initial state of the RPC event flow
 */
const initialState: Readonly<iEventGroup> = {
  signingEvent: {
    eventStage: RPCStageTypes.IDLE,
    rpcName: '',
  },
};

/**
 * Reducer to set the RPC event stage in store
 * @param {iRPCFlowStage} state - the state of the RPC event flow, default to initialState
 * @param {iEventAction} action - the action object contain type and payload to change state.
 * @returns {iRPCFlowStage} - the new state of the sign message flow
 */
const signMessageReducer = (
  state = initialState,
  action: iEventAction = {
    type: '',
    rpcName: '',
  },
) => {
  const eventGroup: string | undefined = rpcToEventGroupMap.get(action.rpcName);

  if (!eventGroup || !state[eventGroup as keyof iEventGroup]) {
    return state;
  }

  switch (action.type) {
    case ActionType.SET_EVENT_STAGE:
      return {
        ...state,
        [eventGroup]: {
          eventStage: action.eventStage,
          rpcName: action.rpcName,
          error: undefined,
        },
      };

    case ActionType.RESET_EVENT_STATE:
      return {
        ...state,
        [eventGroup]: {
          eventStage: RPCStageTypes.IDLE,
          rpcName: '',
          error: undefined,
        },
      };
    case ActionType.SET_EVENT_ERROR:
      return {
        ...state,
        [eventGroup]: {
          eventStage: RPCStageTypes.ERROR,
          rpcName: action.rpcName,
          error: action.error,
        },
      };
    default:
      return state;
  }
};

export default signMessageReducer;
