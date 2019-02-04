export function newTransaction() {
	return {
		type: 'NEW_TRANSACTION'
	};
}

export function setAmount(amount) {
	return {
		type: 'SET_AMOUNT',
		amount
	};
}

export function setData(data) {
	return {
		type: 'SET_DATA',
		data
	};
}

export function setFrom(from) {
	return {
		type: 'SET_FROM',
		from
	};
}

export function setGas(gas) {
	return {
		type: 'SET_GAS',
		gas
	};
}

export function setGasPrice(gasPrice) {
	return {
		type: 'SET_GAS_PRICE',
		gasPrice
	};
}

export function setTo(to) {
	return {
		type: 'SET_TO',
		to
	};
}

export function setSelectedToken(selectedToken) {
	return {
		type: 'SET_SELECTED_TOKEN',
		selectedToken
	};
}

export function setSelectedCollectible(selectedCollectible) {
	return {
		type: 'SET_SELECTED_COLLECTIBLE',
		selectedCollectible
	};
}
