import { REHYDRATE } from 'redux-persist';

const initialState = {
	passwordSet: false,
	seedphraseBackedUp: false,
	backUpSeedphraseVisible: false,
	protectWalletModalVisible: false
};

const userReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			if (action.payload && action.payload.user) {
				return { ...state, ...action.payload.user };
			}
			return state;
		case 'PASSWORD_SET':
			return {
				...state,
				passwordSet: true
			};
		case 'PASSWORD_UNSET':
			return {
				...state,
				passwordSet: false
			};
		case 'SEEDPHRASE_NOT_BACKED_UP':
			return {
				...state,
				seedphraseBackedUp: false,
				backUpSeedphraseVisible: true
			};
		case 'SEEDPHRASE_BACKED_UP':
			return {
				...state,
				seedphraseBackedUp: true,
				backUpSeedphraseVisible: false
			};
		case 'BACK_UP_SEEDPHRASE_VISIBLE':
			return {
				...state,
				backUpSeedphraseVisible: true
			};
		case 'BACK_UP_SEEDPHRASE_NOT_VISIBLE':
			return {
				...state,
				backUpSeedphraseVisible: false
			};
		case 'PROTECT_MODAL_VISIBLE':
			if (!state.seedphraseBackedUp) {
				return {
					...state,
					protectWalletModalVisible: true
				};
			}
			return state;
		case 'PROTECT_MODAL_NOT_VISIBLE':
			return {
				...state,
				protectWalletModalVisible: false
			};
		default:
			return state;
	}
};
export default userReducer;
