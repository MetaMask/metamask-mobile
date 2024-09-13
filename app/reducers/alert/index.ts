import type { AlertAction, AlertData } from 'app/actions/alert';

export interface AlertState {
  isVisible: boolean;
  autodismiss: number | null;
  content: string | null;
  data: AlertData | null;
}

export const initialState: AlertState = {
  isVisible: false,
  autodismiss: null,
  content: null,
  data: null,
};

const alertReducer = (
  // eslint-disable-next-line @typescript-eslint/default-param-last
  state: AlertState = initialState,
  action: AlertAction,
): AlertState => {
  switch (action.type) {
    case 'SHOW_ALERT':
      return {
        ...state,
        isVisible: true,
        autodismiss: action.autodismiss,
        content: action.content,
        data: action.data,
      };
    case 'HIDE_ALERT':
      return {
        ...state,
        isVisible: false,
        autodismiss: null,
      };
    default:
      return state;
  }
};

export default alertReducer;
