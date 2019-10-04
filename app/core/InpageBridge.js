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
		if (!Array.isArray(response)) {
			response = {
				id: '',
				jsonrpc: '2.0',
				...response
			};
		}
		callback && callback(error, response);
		delete this._pending[`${__mmID}`];
	}

	_onStateUpdate(state) {
		const oldAddress = this._selectedAddress;
		const oldNetwork = this._network;
		this._selectedAddress = state.selectedAddress && state.selectedAddress.toLowerCase();
		this._network = state.network;
		oldAddress !== undefined &&
			this._selectedAddress !== oldAddress &&
			this.emit('accountsChanged', [this._selectedAddress]);
		oldNetwork !== undefined && this._network !== oldNetwork && this.emit('networkChanged', this._network);

		// Legacy web3 support
		if (window.web3 && window.web3.eth) {
			window.web3.eth.defaultAccount = this._selectedAddress;
		}
	}

	_sendStandard(method, params = []) {
		if (method === 'eth_requestAccounts') return this.enable();

		return new Promise((resolve, reject) => {
			try {
				this.sendAsync({ method, params, beta: true }, (error, response) => {
					error = error || response.error;
					error ? reject(error) : resolve(response);
				});
			} catch (error) {
				// Per EIP-1193, send should never throw, only reject its Promise. Here
				// we swallow thrown errors, which is safe since we handle them above.
			}
		});
	}

	_sendLegacy(action, callback) {
		if (callback) {
			return this.sendAsync(action, callback);
		}

		let result;

		switch (action.method) {
			case 'eth_accounts':
				result = this._selectedAddress ? [this._selectedAddress] : [];
				break;

			case 'eth_coinbase':
				result = this._selectedAddress;
				break;

			case 'eth_uninstallFilter':
				this.sendAsync(action);
				break;

			case 'net_version':
				result = this._network;
				break;

			default:
				throw new Error(
					`This provider requires a callback to be passed when executing methods like ${
						action.method
					}. This is because all methods are always executed asynchronously. See https://git.io/fNi6S for more information.`
				);
		}

		return {
			id: action.id,
			jsonrpc: action.jsonrpc,
			result
		};
	}

	async _ping() {
		try {
			await this.send('net_version');
			if (!this.isConnected()) {
				this._connected = true;
				this.emit('connect');
			}
		} catch (error) {
			if (this.isConnected()) {
				this._connected = false;
				this.emit('close', {
					code: 1011,
					reason: 'Network connection error'
				});
			}
		}
		setTimeout(() => this._ping(), 10000);
	}

	_subscribe() {
		document.addEventListener('message', ({ data }) => {
			if (data.toString().indexOf('INPAGE_RESPONSE') !== -1 || data.toString().indexOf('STATE_UPDATE') !== -1) {
				this._onMessage(data);
			}
		});

		window.addEventListener('load', () => {
			this._ping();
		});
	}

	/**
	 * Creates a new InpageBridge instance
	 */
	constructor() {
		this._pending = {};
		this._connected = false;
		this.events = {};
		this.isMetaMask = true;
		this._network = undefined; // INITIAL_NETWORK
		this._selectedAddress = undefined; // INITIAL_SELECTED_ADDRESS
		this._subscribe();

		/**
		 * Called by dapps to request access to user accounts
		 *
		 * @param {object} params - Configuration object for account access
		 * @returns {Promise<Array<string>>} - Promise resolving to array of user accounts
		 */
		this.enable = params =>
			new Promise((resolve, reject) => {
				// Temporary fix for peepeth calling
				// ethereum.enable with the wrong context
				const self = this || window.ethereum;
				try {
					self.sendAsync({ method: 'eth_requestAccounts', params }, (error, result) => {
						if (error) {
							reject(error);
							return;
						}
						resolve(result);
					});
				} catch (e) {
					if (e.toString().indexOf('Bridge not ready') !== -1) {
						// Wait 1s and retry

						setTimeout(() => {
							self.sendAsync({ method: 'eth_requestAccounts', params }, (error, result) => {
								if (error) {
									reject(error);
									return;
								}
								resolve(result);
							});
						}, 1000);
					} else {
						throw e;
					}
				}
			});
	}

	/**
	 * Returns the connection status of this provider bridge
	 */
	isConnected() {
		return this._connected;
	}

	/**
	 * Initiates a synchronous RPC call
	 *
	 * @param {object|string} action - Standard RPC method name or legacy payload object
	 * @param {Function|Array} [meta] - Standard RPC method params or legacy callback
	 * @returns - Standard Promise or legacy object containing RPC result
	 */
	send(action, meta) {
		if (typeof action === 'string') {
			return this._sendStandard(action, meta);
		}
		return this._sendLegacy(action, meta);
	}

	/**
	 * Initiates an asynchronous RPC call
	 *
	 * @param {object} payload - Payload object containing method name and argument(s)
	 * @param {Function} callback - Function called when operation completes
	 */
	sendAsync(payload, callback) {
		if (!window.ReactNativeWebView.postMessage) {
			throw new Error('Bridge not ready');
		}
		const random = Math.floor(Math.random() * 100 + 1);
		if (typeof payload === 'string') {
			// Support dapps calling sendAsync('some_method') even though this is not
			// compliant with EIP-1193 and should be send('some_method').
			payload = {
				method: payload,
				params: callback || [],
				__mmID: Date.now() * random,
				hostname: window.location.hostname
			};
		} else if (!Array.isArray(payload)) {
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
		window.ReactNativeWebView.postMessage(
			JSON.stringify({
				payload,
				type: 'INPAGE_REQUEST'
			})
		);
	}

	/**
	 * Called by dapps to use the QR scanner
	 *
	 */
	scanQRCode(regex = null) {
		return new Promise((resolve, reject) => {
			this.sendAsync({ method: 'wallet_scanQRCode' }, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				if (regex && !regex.exec(response.result)) {
					reject({ message: 'NO_REGEX_MATCH', data: response.result });
				} else if (!regex && !/^(0x){1}[0-9a-fA-F]{40}$/i.exec(response.result)) {
					reject({ message: 'INVALID_ETHEREUM_ADDRESS', data: response.result });
				}
				resolve(response.result);
			});
		});
	}

	/**
	 * Attach a listener for a specific event
	 *
	 * @param {string} event - Event name
	 * @param {Function} listener - Callback invoked when event triggered
	 * @returns {InpageBridge}
	 */
	on(event, listener) {
		if (!Array.isArray(this.events[event])) {
			this.events[event] = [];
		}

		this.events[event].push(listener);
	}

	/**
	 * Simulate the once event to keep parity with the EventEmitter interface
	 * because there are some dapps that use it
	 *
	 * @param {string} event - Event name
	 * @param {Function} listener - Callback invoked when event triggered
	 * @returns {InpageBridge}
	 */
	once(event, listener) {
		this.on(event, listener);
	}

	/**
	 * Remove a listener for a specific event
	 *
	 * @param {string} event - Event name
	 * @param {Function} listener - Callback to remove
	 */
	off(event, listener) {
		if (!Array.isArray(this.events[event])) return;
		this.events[event].forEach((cachedListener, i) => {
			if (cachedListener === listener) {
				this.events[event].splice(i, 1);
			}
		});
	}

	/**
	 * Emit data for a given event
	 *
	 * @param {string} event - Event name
	 * @param  {...any} args - Data to emit
	 */
	emit(event, ...args) {
		if (!Array.isArray(this.events[event])) return;
		this.events[event].forEach(listener => {
			listener(...args);
		});
	}
}

window.ethereum = new InpageBridge();

/**
 * Expose nonstandard convenience methods at an application-specific namespace.
 * A Proxy is used so developers can be warned about the use of these methods.
 */
window.ethereum._metamask = new Proxy(
	{
		/**
		 * Determines if user accounts are enabled for this domain
		 *
		 * @returns {boolean} - true if accounts are enabled for this domain
		 */
		isEnabled: () => !!window.ethereum._selectedAddress,

		/**
		 * Determines if user accounts have been previously enabled for this
		 * domain in the past. This is useful for determining if a user has
		 * previously whitelisted a given dapp.
		 *
		 * @returns {Promise<boolean>} - Promise resolving to true if accounts have been previously enabled for this domain
		 */
		isApproved: async () => {
			const response = await window.ethereum.send('metamask_isApproved');
			return response ? response.isApproved : false;
		},

		/**
		 * Determines if MetaMask is unlocked by the user. The mobile application
		 * is always unlocked, so this method exists only for symmetry with the
		 * browser extension.
		 *
		 * @returns {Promise<boolean>} - Promise resolving to true
		 */
		isUnlocked: () => Promise.resolve(true)
	},
	{
		get: (obj, prop) => {
			!window.ethereum._warned &&
				// eslint-disable-next-line no-console
				console.warn(
					'Heads up! ethereum._metamask exposes methods that have ' +
						'not been standardized yet. This means that these methods may not be implemented ' +
						'in other dapp browsers and may be removed from MetaMask in the future.'
				);
			window.ethereum._warned = true;
			return obj[prop];
		}
	}
);

window.postMessage({ type: 'ETHEREUM_PROVIDER_SUCCESS' }, '*');
