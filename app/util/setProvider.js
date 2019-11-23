function setupDappAutoReload(web3, observable) {
	// export web3 as a window, checking for usage
	let reloadInProgress = false;
	let lastTimeUsed;
	let lastSeenNetwork;
	let hasBeenWarned = false;

	window.web3 = new Proxy(web3, {
		get: (_web3, key) => {
			// get the time of use
			lastTimeUsed = Date.now();
			// show warning once on web3 access
			if (!hasBeenWarned && key !== 'currentProvider') {
				console.warn(
					'MetaMask: web3 will be deprecated in the near future in favor of the ethereumProvider\nhttps://medium.com/metamask/4a899ad6e59e'
				);
				hasBeenWarned = true;
			}
			// return value normally
			return _web3[key];
		},
		set: (_web3, key, value) => {
			// set value normally
			_web3[key] = value;
		}
	});

	observable.subscribe((state) => {
		// if the auto refresh on network change is false do not
		// do anything
		if (!window.ethereum.autoRefreshOnNetworkChange) return;

		// if reload in progress, no need to check reload logic
		if (reloadInProgress) return;

		const currentNetwork = state.networkVersion;

		// set the initial network
		if (!lastSeenNetwork) {
			lastSeenNetwork = currentNetwork;
			return;
		}

		// skip reload logic if web3 not used
		if (!lastTimeUsed) return;

		// if network did not change, exit
		if (currentNetwork === lastSeenNetwork) return;

		// initiate page reload
		reloadInProgress = true;
		const timeSinceUse = Date.now() - lastTimeUsed;
		// if web3 was recently used then delay the reloading of the page
		if (timeSinceUse > 500) {
			triggerReset();
		} else {
			setTimeout(triggerReset, 500);
		}
	});
}

// reload the page
function triggerReset() {
	window.location.reload();
}

/* eslint-disable no-undef */
if (!window.chrome) {
	window.chrome = { webstore: true };
}

//
// setup web3
//

if (typeof window.web3 !== 'undefined') {
	throw new Error(`MetaMask detected another web3.
	   MetaMask will not work reliably with another web3 extension.
	   This usually happens if you have two MetaMasks installed,
	   or MetaMask and another web3 extension. Please remove one
	   and try again.`);
}

const web3 = new Web3(window.proxiedInpageProvider);
web3.setProvider = function() {
	console.debug('MetaMask - overrode web3.setProvider');
};
console.debug('MetaMask - injected web3');

setupDappAutoReload(web3, window.inpageProvider.publicConfigStore);

// set web3 defaultAccount
window.inpageProvider.publicConfigStore.subscribe(state => {
	web3.eth.defaultAccount = state.selectedAddress;
});
