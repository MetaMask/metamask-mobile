import { configureStore as configureStoreBase, Tuple } from '@reduxjs/toolkit';
import { thunk } from 'redux-thunk';
import rootReducer from '../../reducers';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function configureStore(initialState: any) {
  return configureStoreBase({
    reducer: rootReducer,
    preloadedState: initialState,
    // Required for dispatching actions made with createAsyncThunk in tests.
    // RTK 2 needs a callback returning a Tuple; returning our own keeps the
    // previous behaviour of replacing the default middleware entirely.
    middleware: () => new Tuple(thunk),
  });
}

export default configureStore;
