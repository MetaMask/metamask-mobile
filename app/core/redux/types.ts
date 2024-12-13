import { AnyAction, Store } from 'redux';
import { RootState } from '../../reducers';

/**
 * Redux store type
 * TODO: Replace AnyAction with union type of all actions
 */
export type ReduxStore = Store<RootState, AnyAction>;
