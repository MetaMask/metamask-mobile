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
		callback && callback(error, response);
		delete this._pending[__mmID];
	}

	_onStateUpdate(state) {
		this._selectedAddress = state.selectedAddress;
		this._network = state.network;
	}

	constructor() {
		this._pending = {};
		this.isMetamask = true;
		document.addEventListener('message', ({ data }) => {
			this._onMessage(data);
		});
	}

	isConnected() {
		return true;
	}

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

	sendAsync(payload, callback) {
		payload = { ...payload, ...{ __mmID: Date.now() } };
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
