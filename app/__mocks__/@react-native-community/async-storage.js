const _isObject = obj => typeof obj === 'object' && !Array.isArray(obj);
const _deepMergeInto = (oldObject, newObject) => {
	const newKeys = Object.keys(newObject);
	const mergedObject = oldObject;

	newKeys.forEach(key => {
		const oldValue = mergedObject[key];
		const newValue = newObject[key];

		if (_isObject(oldValue) && _isObject(newValue)) {
			mergedObject[key] = _deepMergeInto(oldValue, newValue);
		} else {
			mergedObject[key] = newValue;
		}
	});

	return mergedObject;
};

const asMock = {
	__INTERNAL_MOCK_STORAGE__: {},

	setItem: async (key, value, callback) => {
		const setResult = await asMock.multiSet([[key, value]], undefined);

		callback && callback(setResult);
		return setResult;
	},

	getItem: async (key, callback) => {
		const getResult = await asMock.multiGet([key], undefined);

		const result = getResult[0] ? getResult[0][1] : null;

		callback && callback(null, result);
		return result;
	},

	removeItem: (key, callback) => asMock.multiRemove([key], callback),
	mergeItem: (key, value, callback) => asMock.multiMerge([[key, value]], callback),

	clear: _clear,
	getAllKeys: _getAllKeys,
	flushGetRequests: () => null,

	multiGet: _multiGet,
	multiSet: _multiSet,
	multiRemove: _multiRemove,
	multiMerge: _multiMerge
};

async function _multiSet(keyValuePairs, callback) {
	keyValuePairs.forEach(keyValue => {
		const key = keyValue[0];

		asMock.__INTERNAL_MOCK_STORAGE__[key] = keyValue[1];
	});
	callback && callback(null);
	return null;
}

async function _multiGet(keys, callback) {
	const values = keys.map(key => [key, asMock.__INTERNAL_MOCK_STORAGE__[key] || null]);
	callback && callback(null, values);

	return values;
}

async function _multiRemove(keys, callback) {
	keys.forEach(key => {
		if (asMock.__INTERNAL_MOCK_STORAGE__[key]) {
			delete asMock.__INTERNAL_MOCK_STORAGE__[key];
		}
	});

	callback && callback(null);
	return null;
}

async function _clear(callback) {
	asMock.__INTERNAL_MOCK_STORAGE__ = {};

	callback && callback(null);

	return null;
}

async function _getAllKeys() {
	return Object.keys(asMock.__INTERNAL_MOCK_STORAGE__);
}

async function _multiMerge(keyValuePairs, callback) {
	keyValuePairs.forEach(keyValue => {
		const key = keyValue[0];
		const value = JSON.parse(keyValue[1]);

		const oldValue = JSON.parse(asMock.__INTERNAL_MOCK_STORAGE__[key]);

		asMock.__INTERNAL_MOCK_STORAGE__[key] = JSON.stringify(_deepMergeInto(oldValue, value));
	});

	callback && callback(null);
	return null;
}

export default asMock;
