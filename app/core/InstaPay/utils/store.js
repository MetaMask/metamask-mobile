import AsyncStorage from '@react-native-community/async-storage';
import { ConnextClientStorePrefix } from '@connext/client';
/**
 * Class that manages the persistance of the InstaPay Store
 * initializing with previous data if available and persist
 * using AsyncStorage during write and reset operations
 */
class Store {
	constructor(data) {
		this.data = (data && JSON.parse(data)) || {};
	}

	get = path => {
		const raw = this.data[`${path}`];
		let ret;
		if (raw) {
			try {
				ret = JSON.parse(raw);
			} catch {
				ret = raw;
			}
			return ret;
		}

		// Handle partial matches so the following line works -.-
		// https://github.com/counterfactual/monorepo/blob/master/packages/node/src/store.ts#L54
		if (path.endsWith('channel') || path.endsWith('appInstanceIdToProposedAppInstance')) {
			const partialMatches = {};
			for (const k of Object.keys(this.data)) {
				if (k.includes(`${path}/`)) {
					try {
						partialMatches[k.replace(`${path}/`, '')] = JSON.parse(this.data[k]);
					} catch {
						partialMatches[k.replace(`${path}/`, '')] = this.data[k];
					}
				}
			}
			ret = partialMatches;
			return ret;
		}
		return raw;
	};

	set = pairs => {
		for (const pair of pairs) {
			this.data[`${pair.path}`] = typeof pair.value === 'string' ? pair.value : JSON.stringify(pair.value);
			this.persist();
		}
	};

	reset = () => {
		for (const k of Object.keys(this.data)) {
			if (k.startsWith(ConnextClientStorePrefix)) {
				delete this.data[k];
				this.persist();
			}
		}
	};

	persist = async () => {
		await AsyncStorage.setItem(`@MetaMask:InstaPay`, JSON.stringify(this.data));
	};

	clear = () => AsyncStorage.removeItem(`@MetaMask:InstaPay`);
}

let instance;

export default {
	async init() {
		const data = await AsyncStorage.getItem(`@MetaMask:InstaPay`);
		instance = new Store(data);
		Object.freeze(instance);
		return instance;
	},
	reset: () => instance && instance.reset
};
