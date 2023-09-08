import { SignMessageStageTypes } from '../../reducers/signMessage';
import { Action } from 'redux';

/**
 * Deference action types available for Sign Message flow
 */
export enum ActionType {
  SET_SIGN_MESSAGE_STAGE = 'SET_SIGN_MESSAGE_STAGE',
  RESET_SIGN_MESSAGE_STATE = 'RESET_SIGN_MESSAGE_STATE',
  SET_SIGN_MESSAGE_ERROR = 'SET_SIGN_MESSAGE_ERROR',
}

/**
 * Extend redux Action interface to add signStage and error for use in Sign Message flow
 */
export interface iSignMessageAction extends Action {
  signStage?: string;
  error?: Error | unknown;
}

/**
 * Set Sign message stage in store so that component can subscribe to which stage Sign Message flow is in
 * @param {string} signStage - the crrent stage of the sign message flow
 * @returns {iSignMessageAction} - Action object with type and signStage
 */
export function setSignMessageStage(signStage: string): iSignMessageAction {
  return {
    type: ActionType.SET_SIGN_MESSAGE_STAGE,
    signStage,
  };
}

/**
 * Reset the Sign Message stage in store to default IDLE stage.
 * @returns {iSignMessageAction} - Action object to be passed to reducer
 */
export function resetSignMesssageStage(): iSignMessageAction {
  return {
    type: ActionType.RESET_SIGN_MESSAGE_STATE,
  };
}

/**
 * Set the error in store so that component can subscribe to it and process the error.
 * This method will change the signMessageStage to ERROR.
 * @param {Error | unknown} e - Error object to be set in store
 * @returns {iSignMessageAction} - Action object to be passed to reducer
 */
export function setSignMessageError(e: Error | unknown): iSignMessageAction {
  return {
    type: ActionType.SET_SIGN_MESSAGE_ERROR,
    signStage: SignMessageStageTypes.ERROR,
    error: e,
  };
}
