import AsyncStorage from '@react-native-community/async-storage';

// eslint-disable-next-line import/prefer-default-export
export const store = {
	get: async path => {
		const raw = await AsyncStorage.getItem(`CF_NODE:${path}`);
		if (raw) {
			try {
				return JSON.parse(raw);
			} catch {
				return raw;
			}
		}
		// Handle partial matches so the following line works -.-
		// https://github.com/counterfactual/monorepo/blob/master/packages/node/src/store.ts#L54
		if (path.endsWith('channel') || path.endsWith('appInstanceIdToProposedAppInstance')) {
			const partialMatches = {};
			for (const k of Object.keys(localStorage)) {
				if (k.includes(`${path}/`)) {
					try {
						partialMatches[k.replace('CF_NODE:', '').replace(`${path}/`, '')] = JSON.parse(
							localStorage.getItem(k)
						);
					} catch {
						partialMatches[k.replace('CF_NODE:', '').replace(`${path}/`, '')] = localStorage.getItem(k);
					}
				}
			}
			return partialMatches;
		}
		return raw;
	},
	set: async (pairs) => {
		for (const pair of pairs) {
			await AsyncStorage.setItem(
				`CF_NODE:${pair.path}`,
				typeof pair.value === 'string' ? pair.value : JSON.stringify(pair.value)
			);
		}
	},
	reset: async () => {
		for (const k of Object.keys(localStorage)) {
		  if (k.startsWith(ConnextClientStorePrefix)) {
			await AsyncStorage.removeItem(k);
		  }
		}
	  }
};
