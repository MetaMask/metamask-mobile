import { ThunkAction as ReduxThunkAction, ThunkDispatch } from 'redux-thunk';
import { useDispatch } from 'react-redux';
import { AnyAction } from 'redux';
import { RootState } from '../../reducers';

// TODO: `AnyAction` is deprecated as of redux 5 in favour of `UnknownAction`.
// Left in place because it still compiles; replace alongside `ReduxStore` in
// `app/core/redux/types.ts`.
export type ThunkAction = ReduxThunkAction<void, RootState, unknown, AnyAction>;

function useThunkDispatch() {
  return useDispatch<ThunkDispatch<RootState, unknown, AnyAction>>();
}

export default useThunkDispatch;
