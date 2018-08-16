import { REHYDRATE } from 'redux-persist';
import Engine from '../core/Engine';

const {
	datamodel: { state }
} = Engine;

const initialState = {
	backgroundState: state
};

const rootReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			//console.log('REHYDRATING THE ENGINE', action.payload);
			Engine.datamodel.state = action.payload.backgroundState;
			return { ...state, backgroundState: Engine.datamodel.state };
		case 'UPDATE_BG_STATE':
			return { ...state, backgroundState: Engine.datamodel.state };
		default:
			return state;
	}
};
export default rootReducer;
