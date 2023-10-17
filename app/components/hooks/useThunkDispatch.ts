import { useDispatch } from 'react-redux';
import { AnyAction, Store } from 'redux';

type Dispatch = Store<any, AnyAction>['dispatch'];
type GetState = Store<any, AnyAction>['getState'];

export type ThunkAction = (dispatch: Dispatch, getState: GetState) => void;

function useThunkDispatch() {
  return useDispatch<(thunkAction: ThunkAction) => void>();
}
export default useThunkDispatch;
