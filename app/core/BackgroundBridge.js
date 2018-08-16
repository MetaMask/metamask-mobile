/**
 * Module that listens for and responds to messages from an InpageBridge using postMessage
 */
export class BackgroundBridge {
	_engine;
	_webview;

	_onInpageRequest(payload) {
		const { current } = this._webview;
		const { provider } = this._engine.context.NetworkController;
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

	/**
	 * Creates a new BackgroundBridge instance
	 *
	 * @param {Engine} engine - An Engine instance
	 * @param {object} webview - React ref pointing to a WebView
	 */
	constructor(engine, webview) {
		this._engine = engine;
		this._webview = webview;
		engine.context.NetworkController.subscribe(this._sendStateUpdate);
		engine.context.PreferencesController.subscribe(this._sendStateUpdate);
	}

	/**
	 * Called when a new message is received from the InpageBridge
	 *
	 * @param {string} type - Type associated with this message
	 * @param {object} payload - Data sent with this message
	 */
	onMessage({ type, payload }) {
		switch (type) {
			case 'INPAGE_REQUEST':
				this._onInpageRequest(payload);
				break;
		}
	}
}

export default BackgroundBridge;
