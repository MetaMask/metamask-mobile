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
			/* eslint-disable-line no-empty */
		}
	}

	_onBackgroundResponse({ __mmID, error, response }) {
		const callback = this._pending[__mmID];
		if (response.error) {
			/* eslint-disable-next-line no-console */
			console.error(response.error.message);
		}
		callback && callback(error, response);
		delete this._pending[__mmID];
	}

	_onStateUpdate(state) {
		this._selectedAddress = state.selectedAddress;
		this._network = state.network;
	}

	/**
	 * Creates a new InpageBridge instance
	 */
	constructor() {
		this._pending = {};
		this.isMetamask = true;
		this._network = 'INITIAL_NETWORK';
		this._selectedAddress = 'INITIAL_SELECTED_ADDRESS';
		document.addEventListener('message', ({ data }) => {
			this._onMessage(data);
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
					}. This is because all methods are always executed asynchonously. See https://git.io/fNi6S for more information.`
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
		payload = { ...payload, ...{ __mmID: Date.now() * random } };
		this._pending[payload.__mmID] = callback;
		window.postMessage(
			{
				payload,
				type: 'INPAGE_REQUEST'
			},
			'*'
		);
	}
}

window.ethereum = new InpageBridge();

window.originalPostMessage({ type: 'ETHEREUM_PROVIDER_SUCCESS' }, '*');
