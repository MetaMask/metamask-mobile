'use strict';

const ObservableStore = require('obs-store');
import { AsyncStorage } from 'react-native';

class LocalStorageStore extends ObservableStore {
	constructor(opts = {}) {
		super();
		this._storageKey = opts.storageKey;
		if (!this._storageKey) throw new Error('LocalStorageStore - no storageKey specified.');
	}

	//
	// private
	//

	// read from persistence
	async _getState() {
		const serialized = await AsyncStorage.getItem(this._storageKey);
		return serialized ? JSON.parse(serialized) : undefined;
	}

	// write to persistence
	async _putState(newState) {
		const serialized = JSON.stringify(newState);
		return AsyncStorage.setItem(this._storageKey, serialized);
	}
}

module.exports = LocalStorageStore;
