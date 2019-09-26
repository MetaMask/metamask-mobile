/**
 * Module that listens for and responds to messages from an InpageBridge using postMessage
 */
export class BackgroundBridge {
	_engine;
	_rpcOverrides;
	_webview;
	_accounts;

	_postMessageToProvider(message) {
		const current = this._webview.current;
		current &&
			current.injectJavaScript(`window.ethereum && window.ethereum._onMessage(${JSON.stringify(message)})`);
	}

	_onInpageRequest(payload) {
		const { provider } = this._engine.context.NetworkController;
		const override = this._rpcOverrides && this._rpcOverrides[payload.method];
		const __mmID = payload.__mmID + '';
		const done = (error, response) => {
			this._postMessageToProvider(
				JSON.stringify({
					type: 'INPAGE_RESPONSE',
					payload: { error, response, __mmID }
				})
			);
		};
		if (override) {
			override(payload)
				.then(response => {
					done(undefined, response);
				})
				.catch(error => {
					done(error);
				});
		} else {
			delete payload.__mmID;
			delete payload.beta;
			delete payload.hostname;
			provider.sendAsync(payload, done);
		}
	}

	/**
	 * Creates a new BackgroundBridge instance
	 *
	 * @param {Engine} engine - An Engine instance
	 * @param {object} webview - React ref pointing to a WebView
	 * @param {object} rpcOverrides - Map of rpc method overrides
	 */
	constructor(engine, webview, rpcOverrides) {
		this._engine = engine;
		this._rpcOverrides = rpcOverrides;
		this._webview = webview;
		engine.context.NetworkController.subscribe(this.sendStateUpdate);
		engine.context.PreferencesController.subscribe(this.sendStateUpdate);
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

	/**
	 * Sends updated state to the InpageBridge provider
	 */
	sendStateUpdate = () => {
		const { network, selectedAddress } = this._engine.datamodel.flatState;
		const payload = { network };
		if (this._accounts) {
			payload.selectedAddress = selectedAddress;
		}
		this._postMessageToProvider(
			JSON.stringify({
				type: 'STATE_UPDATE',
				payload
			})
		);
	};

	/**
	 * Called to disable inpage account updates
	 */
	disableAccounts() {
		this._accounts = false;
	}

	/**
	 * Called to enable inpage account updates
	 */
	enableAccounts() {
		this._accounts = true;
		this.sendStateUpdate();
	}
}

export default BackgroundBridge;
