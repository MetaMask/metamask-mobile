import { createStore } from 'redux';
import rootReducer from '../../reducers';

function configureStore(initialState: any) {
  return createStore(rootReducer, initialState);
}

export default configureStore;
