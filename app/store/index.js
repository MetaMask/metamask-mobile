import { createStore } from 'redux';
import Engine from '../core/Engine';
import rootReducer from '../reducers';
const store = createStore(rootReducer);

// Dispatch on datamodel updates to update redux state
Engine.datamodel.subscribe(() => {
	store.dispatch({ type: 'UPDATE_BG_STATE' });
});

export default store;
