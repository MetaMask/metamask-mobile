import type {
  WalletConnectPayModalState,
  WalletConnectPayModalAction,
} from './types';

export const initialState: WalletConnectPayModalState = {
  step: 'loading',
  resultStatus: 'success',
  resultMessage: '',
  resultErrorType: null,
  loadingMessage: null,
  selectedOption: null,
  paymentActions: null,
  isLoadingActions: false,
  actionsError: null,
  collectDataCompletedIds: [],
};

export function walletConnectPayModalReducer(
  state: WalletConnectPayModalState,
  action: WalletConnectPayModalAction,
): WalletConnectPayModalState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload };

    case 'RESET':
      return initialState;

    case 'SET_RESULT':
      return {
        ...state,
        resultStatus: action.payload.status,
        resultMessage: action.payload.message,
        resultErrorType: action.payload.errorType ?? null,
        step: 'result',
      };

    case 'SELECT_OPTION':
      return { ...state, selectedOption: action.payload };

    case 'CLEAR_SELECTED_OPTION':
      return {
        ...state,
        selectedOption: null,
        paymentActions: null,
        actionsError: null,
      };

    case 'SET_PAYMENT_ACTIONS':
      return { ...state, paymentActions: action.payload };

    case 'SET_LOADING_ACTIONS':
      return { ...state, isLoadingActions: action.payload };

    case 'SET_ACTIONS_ERROR':
      return { ...state, actionsError: action.payload };

    case 'MARK_COLLECT_DATA_COMPLETED':
      return {
        ...state,
        collectDataCompletedIds: state.collectDataCompletedIds.includes(
          action.payload,
        )
          ? state.collectDataCompletedIds
          : [...state.collectDataCompletedIds, action.payload],
      };

    default:
      return state;
  }
}
