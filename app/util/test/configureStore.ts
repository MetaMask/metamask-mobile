import { createStore } from 'redux';
import rootReducer from '../../reducers';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function configureStore(initialState: any) {
  return createStore(rootReducer, initialState);
}

export default configureStore;
