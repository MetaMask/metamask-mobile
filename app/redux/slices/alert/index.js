import MigratedStorage from '../../storage/MigratedStorage';
import { persistReducer } from 'redux-persist';

const initialState = {
  isVisible: false,
  autodismiss: null,
  content: null,
  data: null,
};

const reducer = (state = initialState, action) => {
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

const alertPersistConfig = {
  key: 'alert',
  blacklist: [],
  storage: MigratedStorage,
};

const alertReducer = persistReducer(alertPersistConfig, reducer);

export default alertReducer;
