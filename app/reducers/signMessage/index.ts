import { ActionType, iSignMessageAction } from "../../actions/signMessage";

/**
 * Deference anction types available for Sign Message flow
 */
export enum SignMessageStageTypes {
  IDLE = 'idle',
  REQUEST_SEND = 'request_send',
  COMPLETE = 'complete',
  ERROR = 'error',
}

/**
 * Interface for defining what properties will be defined in store
 */
export interface iSignMessageStage {
  signMessageStage: string,
  error?: Error,
}

/**
 * Initial state of the sign message flow
 */
const initialState: Readonly<iSignMessageStage> = {
  signMessageStage: SignMessageStageTypes.IDLE,
  error: undefined,
};

/**
 * Reducer to set the sign message stage in store
 * @param {iSignMessageStage} state - the state of the sign message flow, default to initialState
 * @param {iSignMessageAction} action - the action object with type and signStage
 * @returns {iSignMessageStage} - the new state of the sign message flow
 */
const signMessageReducer = (
  state: iSignMessageStage = initialState,
  action: iSignMessageAction,
) => {
  switch (action.type) {
    case ActionType.SET_SIGN_MESSAGE_STAGE:
      return {
        ...state,
        signMessageStage: action.signStage,
        error: undefined,
      };

    case ActionType.RESET_SIGN_MESSAGE_STATE:
      return {
        ...state,
        signMessageStage: SignMessageStageTypes.IDLE,
        error: undefined,
      };
    case ActionType.SET_SIGN_MESSAGE_ERROR:
      return {
        ...state,
        signMessageStage: SignMessageStageTypes.ERROR,
        error: action.error,
      };
    default:
      return state;
  }
};

export default signMessageReducer;
