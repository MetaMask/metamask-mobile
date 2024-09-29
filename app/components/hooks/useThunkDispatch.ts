import { ThunkAction as ReduxThunkAction, ThunkDispatch } from 'redux-thunk';
import { useDispatch } from 'react-redux';
import { AnyAction } from 'redux';
import { RootState } from '../../reducers';

export type ThunkAction = ReduxThunkAction<void, RootState, unknown, AnyAction>;

function useThunkDispatch() {
  return useDispatch<ThunkDispatch<RootState, unknown, AnyAction>>();
}

export default useThunkDispatch;
