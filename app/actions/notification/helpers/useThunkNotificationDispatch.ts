import { useDispatch } from 'react-redux';
import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';

import { RootState } from '../../../reducers';

export type ThunkNotificationDispatch = ThunkDispatch<
  RootState,
  unknown,
  AnyAction
>;
export const useThunkNotificationDispatch = () =>
  useDispatch<ThunkNotificationDispatch>();
