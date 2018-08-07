export class InpageBridge {
	_engine;
	_webview;

	_onInpageRequest(payload) {
		const { current } = this._webview;
		const { provider } = this._engine.api.network;
		provider.sendAsync(payload, (error, response) => {
			current &&
				current.postMessage(
					JSON.stringify({
						type: 'INPAGE_RESPONSE',
						payload: { error, response, __mmID: payload.__mmID }
					})
				);
		});
	}

	_sendStateUpdate = () => {
		const { current } = this._webview;
		const { network, selectedAddress } = this._engine.datamodel.flatState;
		current &&
			current.postMessage({
				type: 'STATE_UPDATE',
				payload: { network, selectedAddress }
			});
	};

	constructor(engine, webview) {
		this._engine = engine;
		this._webview = webview;
		engine.api.network.subscribe(this._sendStateUpdate);
		engine.api.preferences.subscribe(this._sendStateUpdate);
	}

	onMessage({ type, payload }) {
		switch (type) {
			case 'INPAGE_REQUEST':
				this._onInpageRequest(payload);
				break;
		}
	}
}

export default InpageBridge;
