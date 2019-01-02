/**
 * Module that listens for and responds to messages from an BackgroundBridge using postMessage
 * and exposes an Ethereum provider API to the dapp context
 */
class InpageBridge {
	_onMessage(data) {
		try {
			const { payload, type } = JSON.parse(data);
			switch (type) {
				case 'STATE_UPDATE':
					this._onStateUpdate(payload);
					break;

				case 'INPAGE_RESPONSE':
					this._onBackgroundResponse(payload);
					break;
			}
		} catch (error) {
			console.error(error); // eslint-disable-line no-console
		}
	}

	_onBackgroundResponse({ __mmID, error, response }) {
		const callback = this._pending[`${__mmID}`];
		if (!error && response.error) {
			error = response.error;
		}
		callback && callback(error, response);
		delete this._pending[`${__mmID}`];
	}

	_onStateUpdate(state) {
		this._selectedAddress = state.selectedAddress && state.selectedAddress.toLowerCase();
		this._network = state.network;
		// Legacy Provider support
		if (window.web3 && window.web3.eth) {
			window.web3.eth.defaultAccount = this._selectedAddress;
			try {
				window.web3.eth.accounts = [this._selectedAddress];
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error('Error while setting window.web3.eth.accounts on', location.href);
			}
		}
	}

	/**
	 * Creates a new InpageBridge instance
	 */
	constructor() {
		this._pending = {};
		this.isMetaMask = true;
		this._network = undefined; // INITIAL_NETWORK
		this._selectedAddress = undefined; // INITIAL_SELECTED_ADDRESS
		document.addEventListener('message', ({ data }) => {
			if (data.toString().indexOf('INPAGE_RESPONSE') !== -1 || data.toString().indexOf('STATE_UPDATE') !== -1) {
				this._onMessage(data);
			}
		});
	}

	/**
	 * Returns the connection status of this provider bridge
	 */
	isConnected() {
		return true;
	}

	/**
	 * Initiates a synchronous RPC call
	 *
	 * @param {object} payload - Payload object containing method name and argument(s)
	 * @returns - Object containing RPC result and metadata
	 */
	send(payload) {
		let result;

		switch (payload.method) {
			case 'eth_accounts':
				result = this._selectedAddress ? [this._selectedAddress] : [];
				break;

			case 'eth_coinbase':
				result = this._selectedAddress;
				break;

			case 'eth_uninstallFilter':
				this.sendAsync(payload);
				break;

			case 'net_version':
				result = this._network;
				break;

			default:
				throw new Error(
					`This provider requires a callback to be passed when executing methods like ${
						payload.method
					}. This is because all methods are always executed asynchronously. See https://git.io/fNi6S for more information.`
				);
		}

		return {
			id: payload.id,
			jsonrpc: payload.jsonrpc,
			result
		};
	}

	/**
	 * Initiates an asynchronous RPC call
	 *
	 * @param {object} payload - Payload object containing method name and argument(s)
	 * @param {Function} callback - Function called when operation completes
	 */
	sendAsync(payload, callback) {
		const random = Math.floor(Math.random() * 100 + 1);
		if (!Array.isArray(payload)) {
			payload = {
				...payload,
				__mmID: Date.now() * random,
				hostname: window.location.hostname
			};
		} else {
			// Batch request support
			payload = payload.map(request => ({
				...request,
				__mmID: Date.now() * random,
				hostname: window.location.hostname
			}));
		}
		this._pending[`${payload.__mmID}`] = callback;
		window.postMessageToNative({
			payload,
			type: 'INPAGE_REQUEST'
		});
	}

	/**
	 * Called by dapps to request access to user accounts
	 *
	 * @param {object} params - Configuration object for account access
	 * @returns {Promise<Array<string>>} - Promise resolving to array of user accounts
	 */
	enable(params) {
		return new Promise((resolve, reject) => {
			// Temporary fix for peepeth calling
			// ethereum.enable with the wrong context
			const self = this || window.ethereum;
			self.sendAsync({ method: 'eth_requestAccounts', params }, (error, result) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(result);
			});
		});
	}
}

window.ethereum = new InpageBridge();
window.postMessage({ type: 'ETHEREUM_PROVIDER_SUCCESS' }, '*');
