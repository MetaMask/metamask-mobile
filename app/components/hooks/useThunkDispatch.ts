import { useDispatch } from 'react-redux';
import { AnyAction, Store } from 'redux';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dispatch = Store<any, AnyAction>['dispatch'];
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GetState = Store<any, AnyAction>['getState'];

export type ThunkAction = (dispatch: Dispatch, getState: GetState) => void;

function useThunkDispatch() {
  return useDispatch<(thunkAction: ThunkAction) => void>();
}
export default useThunkDispatch;
