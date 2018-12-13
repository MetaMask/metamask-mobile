import { REHYDRATE } from 'redux-persist';
import Engine from '../core/Engine';
import { store } from '../store';
import bookmarksReducer from './bookmarks';
import { combineReducers } from 'redux';

const initialState = {
	backgroundState: {}
};

function initalizeEngine(state = {}) {
	Engine.init(state);
	Engine.datamodel &&
		Engine.datamodel.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE' });
		});
}

const rootReducer = combineReducers({
	engine: (state = initialState, action) => {
		switch (action.type) {
			case REHYDRATE:
				initalizeEngine(action.payload && action.payload.backgroundState);
				return { ...state, ...action.payload };
			case 'UPDATE_BG_STATE':
				return { ...state, backgroundState: Engine.state };
			default:
				return state;
		}
	},
	bookmarks: bookmarksReducer
})


export default rootReducer;
