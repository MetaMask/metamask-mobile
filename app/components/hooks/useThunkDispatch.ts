import { useDispatch } from 'react-redux';
import { store } from '../../store';
type Dispatch = typeof store.dispatch;
type GetState = typeof store.getState;

export type ThunkAction = (dispatch: Dispatch, getState: GetState) => void;

function useThunkDispatch() {
  return useDispatch<(thunkAction: ThunkAction) => void>();
}
export default useThunkDispatch;
