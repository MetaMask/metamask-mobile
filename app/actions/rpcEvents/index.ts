import { RPCStageTypes } from '../../reducers/rpcEvents';
import { Action } from 'redux';

/**
 * Deference action types available for different RPC event flow
 */
export enum ActionType {
  SET_EVENT_STAGE = 'SET_EVENT_STAGE',
  RESET_EVENT_STATE = 'RESET_EVENT_STATE',
  SET_EVENT_ERROR = 'SET_EVENT_ERROR',
}

/**
 * Extend redux Action interface to add rpcName, eventStage and error properties
 */
export interface iEventAction extends Action {
  rpcName: string;
  eventStage?: string;
  error?: Error | unknown;
}

/**
 * Set the new RPC event stage.
 * @param {string} rpcName - the rpc mehtod name which fires the event
 * @param {string} eventStage - the crrent stage of the eventflow
 * @returns {iEventAction} - Action object with type and payload to be passed to reducer
 */
export function setEventStage(
  rpcName: string,
  eventStage: string,
): iEventAction {
  return {
    rpcName,
    type: ActionType.SET_EVENT_STAGE,
    eventStage,
  };
}

/**
 * Reset the RPC event stage in store to default IDLE stage.
 * @param {string} rpcName - the rpc method name which fires the event
 * @returns {iEventAction} - Action object with type and payload to be passed to reducer
 */
export function resetEventStage(rpcName: string): iEventAction {
  return {
    type: ActionType.RESET_EVENT_STATE,
    rpcName,
  };
}

/**
 * Set the error stage if any error occurs in the event flow.
 * This method will change the event group stage to ERROR.
 * @param {string} rpcName - the rpc method name which fires the event
 * @param {Error | unknown} e - Error object to be set in store
 * @returns {iEventAction} - Action object to be passed to reducer
 */
export function setEventStageError(
  rpcName: string,
  e: Error | unknown,
): iEventAction {
  return {
    type: ActionType.SET_EVENT_ERROR,
    rpcName,
    eventStage: RPCStageTypes.ERROR,
    error: e,
  };
}
