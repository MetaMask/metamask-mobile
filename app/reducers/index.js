import { REHYDRATE } from 'redux-persist';
import Engine from '../core/Engine';
import { store } from '../store';
import Logger from '../util/Logger';

const initialState = {
	backgroundState: {}
};

function initalizeEngine(state = {}) {
	Logger.log('Initializing engine with previous state', state);
	Engine.init(state);
	Engine.get().datamodel.subscribe(() => {
		Logger.log('Engine datamodel updated', Engine.get().datamodel.state.KeyringController);
		store.dispatch({ type: 'UPDATE_BG_STATE' });
	});
}

const rootReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			initalizeEngine(action.payload && action.payload.backgroundState);
			return { ...state, backgroundState: Engine.get().datamodel.state };
		case 'UPDATE_BG_STATE':
			return { ...state, backgroundState: Engine.get().datamodel.state };
		default:
			return state;
	}
};
export default rootReducer;
