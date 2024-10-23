import { stakeApi } from '../../components/UI/Stake/slices/stakingApi';
import rootReducer from '../../reducers';
import { configureStore as initStore, Middleware } from '@reduxjs/toolkit';

function configureStore(initialState = {}, middlewares: Middleware[] = []) {
  middlewares.push(stakeApi.middleware);
  return initStore({
    reducer: rootReducer,
    preloadedState: initialState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(...middlewares), // Middlewares are optional, default is []
  });
}
export default configureStore;
