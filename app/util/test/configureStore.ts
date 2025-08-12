import { configureStore as configureStoreBase } from '@reduxjs/toolkit';
import thunk from 'redux-thunk';
import rootReducer from '../../reducers';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function configureStore(initialState: any) {
  return configureStoreBase({
    reducer: rootReducer,
    preloadedState: initialState,
    // Required for dispatching actions made with createAsyncThunk in tests
    middleware: [thunk]
  });
}

export default configureStore;
