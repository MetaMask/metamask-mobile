import { REHYDRATE } from 'redux-persist';

const initialState = {
	value: undefined,
	data: undefined,
	from: undefined,
	gas: undefined,
	gasPrice: undefined,
	to: undefined,
	asset: undefined,
	selectedAsset: undefined,
	type: undefined,
	assetType: undefined,
	id: undefined,
	readableValue: undefined,
	ensRecipient: undefined,
	symbol: undefined,
	paymentChannelTransaction: undefined,
	isDeepLinkTransaction: undefined
};

const getAssetType = selectedAsset => {
	let assetType;
	if (selectedAsset) {
		if (selectedAsset.tokenId) {
			assetType = 'ERC721';
		} else if (selectedAsset.isETH) {
			assetType = 'ETH';
		} else {
			assetType = 'ERC20';
		}
	}
	return assetType;
};

const transactionReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			return {
				...initialState
			};
		case 'NEW_TRANSACTION':
			return {
				...state,
				...initialState
			};
		case 'SET_SELECTED_ASSET': {
			const selectedAsset = action.selectedAsset;
			const assetType = getAssetType(selectedAsset);
			return {
				...state,
				selectedAsset,
				assetType
			};
		}
		case 'SET_TRANSACTION_OBJECT': {
			const selectedAsset = action.transaction.selectedAsset;
			if (selectedAsset) {
				const assetType = getAssetType(selectedAsset);
				action.transaction.assetType = assetType;
			}
			return {
				...state,
				...action.transaction
			};
		}
		case 'SET_TOKENS_TRANSACTION': {
			const selectedAsset = action.asset;
			const assetType = getAssetType(selectedAsset);
			return {
				...state,
				type: 'TOKENS_TRANSACTION',
				selectedAsset: action.asset,
				assetType
			};
		}
		case 'SET_PAYMENT_CHANNEL_TRANSACTION': {
			const selectedAsset = action.asset;
			const assetType = getAssetType(selectedAsset);
			return {
				...state,
				type: 'PAYMENT_CHANNEL_TRANSACTION',
				selectedAsset: action.asset,
				assetType,
				paymentChannelTransaction: true
			};
		}
		case 'SET_ETHER_TRANSACTION':
			return {
				...state,
				symbol: 'ETH',
				assetType: 'ETH',
				selectedAsset: { isETH: true, symbol: 'ETH' },
				type: 'ETHER_TRANSACTION',
				...action.transaction
			};
		case 'SET_INDIVIDUAL_TOKEN_TRANSACTION':
			return {
				...state,
				selectedAsset: action.token,
				type: 'INDIVIDUAL_TOKEN_TRANSACTION'
			};
		case 'SET_INDIVIDUAL_COLLECTIBLE_TRANSACTION':
			return {
				...state,
				selectedAsset: action.collectible,
				assetType: 'ERC721',
				type: 'INDIVIDUAL_COLLECTIBLE_TRANSACTION'
			};
		case 'SET_COLLECTIBLE_CONTRACT_TRANSACTION':
			return {
				...state,
				selectedAsset: action.collectible,
				assetType: 'ERC721',
				type: 'CONTRACT_COLLECTIBLE_TRANSACTION'
			};
		default:
			return state;
	}
};
export default transactionReducer;
