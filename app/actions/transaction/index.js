export function newTransaction() {
	return {
		type: 'NEW_TRANSACTION'
	};
}

export function setValue(value) {
	return {
		type: 'SET_VALUE',
		value
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

export function prepareTransaction(gas, gasPrice, value) {
	return {
		type: 'PREPARE_TRANSACTION',
		gas,
		gasPrice,
		value
	};
}

export function prepareTokenTransaction(gas, gasPrice, value, to) {
	return {
		type: 'PREPARE_TOKEN_TRANSACTION',
		gas,
		gasPrice,
		value,
		to
	};
}

export function sanitizeTransaction(gas, gasPrice) {
	return {
		type: 'SANITIZE_TRANSACTION',
		gas,
		gasPrice
	};
}
