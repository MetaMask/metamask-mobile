import type {
  PaymentOption,
  Action,
  PaymentOptionsResponse,
  PaymentInfo,
  CollectDataAction,
  ConfirmPaymentResponse,
} from '@walletconnect/pay';

export type {
  PaymentOption,
  Action,
  PaymentOptionsResponse,
  PaymentInfo,
  CollectDataAction,
  ConfirmPaymentResponse,
};

export type ModalStep =
  | 'loading'
  | 'collectData'
  | 'confirm'
  | 'confirming'
  | 'result';

export type ResultStatus = 'success' | 'error';

export type ErrorType =
  | 'insufficient_funds'
  | 'expired'
  | 'cancelled'
  | 'not_found'
  | 'generic';

export interface WalletConnectPayModalState {
  step: ModalStep;
  resultStatus: ResultStatus;
  resultMessage: string;
  resultErrorType: ErrorType | null;
  loadingMessage: string | null;
  selectedOption: PaymentOption | null;
  paymentActions: Action[] | null;
  isLoadingActions: boolean;
  actionsError: string | null;
  collectDataCompletedIds: string[];
}

export type WalletConnectPayModalAction =
  | { type: 'SET_STEP'; payload: ModalStep }
  | { type: 'RESET' }
  | {
      type: 'SET_RESULT';
      payload: {
        status: ResultStatus;
        message: string;
        errorType?: ErrorType;
      };
    }
  | { type: 'SELECT_OPTION'; payload: PaymentOption }
  | { type: 'CLEAR_SELECTED_OPTION' }
  | { type: 'SET_PAYMENT_ACTIONS'; payload: Action[] }
  | { type: 'SET_LOADING_ACTIONS'; payload: boolean }
  | { type: 'SET_ACTIONS_ERROR'; payload: string | null }
  | { type: 'MARK_COLLECT_DATA_COMPLETED'; payload: string };

export interface WalletConnectPayModalParams {
  paymentUrl: string;
}
