import { REHYDRATE } from 'redux-persist';
import Engine from '../core/Engine';
import { store } from '../store';

const initialState = {
	backgroundState: {}
};

function initalizeEngine(state = {}) {
	//console.log('INITIALIZING THE ENGINE');
	Engine.init(state);
	//console.log('SUBSCRIBING REDUX TO ENGINE DATAMODEL UPDATES');
	Engine.get().datamodel.subscribe(() => {
		//console.log('ENGINE DATAMODEL UPDATED', Engine.get().datamodel.state);
		store.dispatch({ type: 'UPDATE_BG_STATE' });
	});
}

const rootReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			//console.log('REHYDRATING THE ENGINE', action.payload);
			initalizeEngine(action.payload && action.payload.backgroundState);
			return { ...state, backgroundState: Engine.get().datamodel.state };
		case 'UPDATE_BG_STATE':
			return { ...state, backgroundState: Engine.get().datamodel.state };
		default:
			return state;
	}
};
export default rootReducer;
