import { AnyAction, Store } from 'redux';
import { RootState } from '../../reducers';

/**
 * Redux store type
 *
 * TODO: `AnyAction` is deprecated as of redux 5 in favour of `UnknownAction`.
 * It is still exported so this compiles, but it should be replaced with a union
 * type of all actions (preferred) or `UnknownAction`. This is the central
 * definition, so changing it here is the starting point for the rest.
 */
export type ReduxStore = Store<RootState, AnyAction>;
