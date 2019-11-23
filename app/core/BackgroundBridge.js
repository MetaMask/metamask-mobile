/* eslint-disable import/no-commonjs */
import URL from 'url-parse';
import { JS_POST_MESSAGE_TO_PROVIDER } from '../util/browserScripts';
import MobilePortStream from './MobilePortStream';
import { setupMultiplex } from '../util/streams';
import { createOriginMiddleware, createLoggerMiddleware } from '../util/middlewares';
import Engine from './Engine';
import NetworkList from '../util/networks';
const ObservableStore = require('obs-store')
const RpcEngine = require('json-rpc-engine');
const createEngineStream = require('json-rpc-middleware-stream/engineStream');
const createFilterMiddleware = require('eth-json-rpc-filters');
const createSubscriptionManager = require('eth-json-rpc-filters/subscriptionManager');
const providerAsMiddleware = require('eth-json-rpc-middleware/providerAsMiddleware');
const pump = require('pump');
const asStream = require('obs-store/lib/asStream')
// eslint-disable-next-line import/no-nodejs-modules
const EventEmitter = require('events').EventEmitter;

/**
 * Module that listens for and responds to messages from an InpageBridge using postMessage
 */

class Port extends EventEmitter {
	constructor(window) {
		super();
		this._window = window;
	}

	postMessage = (msg, origin = '*') => {
		// Loop through the iframes first
		// If the source doesn't match any
		// send the message to the main window
		const js = JS_POST_MESSAGE_TO_PROVIDER(msg, origin);
		this._window && this._window.injectJavaScript(js);
	};
}

export class BackgroundBridge extends EventEmitter {
	constructor(webview, url, middlewares, shouldExposeAccounts) {
		console.log('initializing bridge for ', url);
		super();
		this._webviewRef = webview && webview.current;
		this.middlewares = middlewares;
		this.shouldExposeAccounts = shouldExposeAccounts;
		this.provider = Engine.context.NetworkController.provider;
		this.blockTracker = Engine.context.NetworkController.blockTracker;
		this.port = new Port(this._webviewRef);

		const senderUrl = new URL(url);

		const portStream = new MobilePortStream(this.port);
		// setup multiplexing
		const mux = setupMultiplex(portStream);
		// connect features
		this.setupProviderConnection(mux.createStream('provider'), senderUrl);
		this.setupPublicConfig(mux.createStream('publicConfig'), senderUrl)
	}

	onMessage = msg => {
		this.port.emit('message', { name: msg.name, data: msg.data });
	};

	onDisconnect = () => {
		this.port.emit('disconnect', { name: this.port.name, data: null });
	};

	/**
	 * A method for serving our ethereum provider over a given stream.
	 * @param {*} outStream - The stream to provide over.
	 * @param {URL} senderUrl - The URI of the requesting resource.
	 * @param {string} extensionId - The id of the extension, if the requesting
	 * resource is an extension.
	 * @param {object} publicApi - The public API
	 */
	setupProviderConnection(outStream, senderUrl, publicApi) {
		const getSiteMetadata = publicApi && publicApi.getSiteMetadata;
		const engine = this.setupProviderEngine(senderUrl, getSiteMetadata);

		// setup connection
		const providerStream = createEngineStream({ engine });

		pump(outStream, providerStream, outStream, err => {
			// handle any middleware cleanup
			engine._middleware.forEach(mid => {
				if (mid.destroy && typeof mid.destroy === 'function') {
					mid.destroy();
				}
			});
			if (err) console.warn(err);
		});
	}

	/**
	 * A method for creating a provider that is safely restricted for the requesting domain.
	 **/
	setupProviderEngine(senderUrl) {
		const origin = senderUrl.hostname;
		// setup json rpc engine stack
		const engine = new RpcEngine();
		const provider = this.provider;

		const blockTracker = this.blockTracker;

		// create filter polyfill middleware
		const filterMiddleware = createFilterMiddleware({ provider, blockTracker });

		// create subscription polyfill middleware
		const subscriptionManager = createSubscriptionManager({ provider, blockTracker });
		subscriptionManager.events.on('notification', message => engine.emit('notification', message));

		// metadata
		engine.push(createOriginMiddleware({ origin }));
		engine.push(createLoggerMiddleware({ origin }));
		// filter and subscription polyfills
		engine.push(filterMiddleware);
		engine.push(subscriptionManager.middleware);
		// watch asset

		// @TODO
		//engine.push(this.preferencesController.requestWatchAsset.bind(this.preferencesController))

		// requestAccounts
		engine.push(this.middlewares.eth_requestAccounts(senderUrl));
		engine.push(this.middlewares.eth_accounts(senderUrl));
		engine.push(this.middlewares.eth_sign());

		// forward to metamask primary provider
		engine.push(providerAsMiddleware(provider));
		return engine;
	}

	/**
	* A method for providing our public config info over a stream.
	* This includes info we like to be synchronous if possible, like
	* the current selected account, and network ID.
	*
	* Since synchronous methods have been deprecated in web3,
	* this is a good candidate for deprecation.
	*
	* @param {*} outStream - The stream to provide public config over.
	* @param {URL} senderUrl - The URL of requesting resource
	*/
	setupPublicConfig (outStream, senderUrl) {
		const configStore = this.createPublicConfigStore({
			// check the providerApprovalController's approvedOrigins
			checkIsEnabled: () => this.shouldExposeAccounts(senderUrl.hostname),
		})

		const configStream = asStream(configStore)

		pump(
			configStream,
			outStream,
			(err) => {
				configStore.destroy()
				configStream.destroy()
				if (err) {
					console.warn(err)
				}
			}
		)
	}

	/**
	* Constructor helper: initialize a public config store.
	* This store is used to make some config info available to Dapps synchronously.
	*/
	createPublicConfigStore ({ checkIsEnabled }) {
		// subset of state for metamask inpage provider
		const publicConfigStore = new ObservableStore()

		// setup memStore subscription hooks
		this.on('update', updatePublicConfigStore)
		updatePublicConfigStore(this.getState())

		publicConfigStore.destroy = () => {
			this.removeEventListener && this.removeEventListener('update', updatePublicConfigStore)
		}

		function updatePublicConfigStore (memState) {
			if(!memState){
				memState = this.getState();
			}
			const publicState = selectPublicState(memState)
			console.log('Updating publicState', publicState);
			publicConfigStore.putState(publicState)
		}

		function selectPublicState ({ isUnlocked, selectedAddress, network }) {
			const isEnabled = checkIsEnabled()
			const isReady = isUnlocked && isEnabled
			const networkType = Engine.context.NetworkController.state.provider.type;
			const chainId = Object.keys(NetworkList).indexOf(networkType) > -1 && NetworkList[networkType].chainId;
			const result = {
				isUnlocked,
				isEnabled,
				selectedAddress: isReady ? selectedAddress : null,
				networkVersion: network,
				chainId: `0x${parseInt(chainId, 10).toString(16)}`
			}
			return result;
		}

		return publicConfigStore
	}

	/**
	 * The metamask-state of the various controllers, made available to the UI
	 *
	 * @returns {Object} status
	 */
	getState () {
		const vault = Engine.context.KeyringController.state.vault
		const isInitialized = !!vault;
		const { network, selectedAddress } = Engine.datamodel.flatState;
		return {
			...{ isInitialized },
			isUnlocked: true,
			network,
			selectedAddress
		}
	}


	// _engine;
	// _rpcOverrides;
	// _webview;
	// _accounts;

	// _postMessageToProvider(message, origin) {
	// 	const current = this._webview.current;
	// 	// Loop through the iframes first
	// 	// If the source doesn't match any
	// 	// send the message to the main window
	// 	const js = JS_POST_MESSAGE_TO_PROVIDER(message, origin);
	// 	current && current.injectJavaScript(js);
	// }

	// _onInpageRequest(payload, origin) {
	// 	const { provider } = this._engine.context.NetworkController;
	// 	const override = this._rpcOverrides && this._rpcOverrides[payload.method];
	// 	const __mmID = payload.__mmID + '';
	// 	const done = (error, response) => {
	// 		this._postMessageToProvider(
	// 			JSON.stringify({
	// 				type: 'INPAGE_RESPONSE',
	// 				payload: { error, response, __mmID }
	// 			}),
	// 			origin
	// 		);
	// 	};
	// 	if (override) {
	// 		override(payload)
	// 			.then(response => {
	// 				done(undefined, response);
	// 			})
	// 			.catch(error => {
	// 				done(error);
	// 			});
	// 	} else {
	// 		delete payload.__mmID;
	// 		delete payload.origin;
	// 		delete payload.beta;
	// 		delete payload.hostname;
	// 		provider.sendAsync(payload, done);
	// 	}
	// }

	// /**
	//	* Creates a new BackgroundBridge instance
	//	*
	//	* @param {Engine} engine - An Engine instance
	//	* @param {object} webview - React ref pointing to a WebView
	//	* @param {object} rpcOverrides - Map of rpc method overrides
	//	*/
	// constructor(engine, webview, rpcOverrides) {
	// 	this._engine = engine;
	// 	this._rpcOverrides = rpcOverrides;
	// 	this._webview = webview;
	// 	engine.context.NetworkController.subscribe(this.sendStateUpdate);
	// 	engine.context.PreferencesController.subscribe(this.sendStateUpdate);
	// }

	// /**
	//	* Called when a new message is received from the InpageBridge
	//	*
	//	* @param {string} type - Type associated with this message
	//	* @param {object} payload - Data sent with this message
	//	*/
	// onMessage({ type, payload, origin }) {
	// 	switch (type) {
	// 		case 'INPAGE_REQUEST':
	// 			this._onInpageRequest(payload, origin);
	// 			break;
	// 	}
	// }

	// /**
	//	* Sends updated state to the InpageBridge provider
	//	*/
	// sendStateUpdate = () => {
	// 	const { network, selectedAddress } = this._engine.datamodel.flatState;
	// 	const payload = { network };
	// 	if (this._accounts) {
	// 		payload.selectedAddress = selectedAddress.toLowerCase();
	// 	}
	// 	this._postMessageToProvider(
	// 		JSON.stringify({
	// 			type: 'STATE_UPDATE',
	// 			payload
	// 		}),
	// 		'*'
	// 	);
	// };

	// /**
	//	* Called to disable inpage account updates
	//	*/
	// disableAccounts() {
	// 	this._accounts = false;
	// }

	// /**
	//	* Called to enable inpage account updates
	//	*/
	// enableAccounts() {
	// 	if (!this._accounts) {
	// 		this._accounts = true;
	// 		this.sendStateUpdate();
	// 	}
	// }
}

export default BackgroundBridge;
