/* eslint-disable import/no-commonjs */
import URL from 'url-parse';
import { JS_POST_MESSAGE_TO_PROVIDER } from '../util/browserScripts';
import MobilePortStream from './MobilePortStream';
import { setupMultiplex } from '../util/streams';
import createDnodeRemoteGetter from '../util/createDnodeRemoteGetter';
import { createOriginMiddleware, createLoggerMiddleware } from '../util/middlewares';
import Engine from './Engine';
const RpcEngine = require('json-rpc-engine');
const createEngineStream = require('json-rpc-middleware-stream/engineStream');
const createFilterMiddleware = require('eth-json-rpc-filters');
const createSubscriptionManager = require('eth-json-rpc-filters/subscriptionManager');
const providerAsMiddleware = require('eth-json-rpc-middleware/providerAsMiddleware');
const pump = require('pump');
const Dnode = require('dnode');
const pify = require('pify');
// eslint-disable-next-line import/no-nodejs-modules
const EventEmitter = require('events').EventEmitter;

/**
 * Module that listens for and responds to messages from an InpageBridge using postMessage
 */

class Port extends EventEmitter {
	constructor(window){
		super();
		this._window = window;
	}

	postMessage = (msg, origin = '*') => {
		console.log('BGBridge::postMessage via port', msg);
		// Loop through the iframes first
		// If the source doesn't match any
		// send the message to the main window
		const js = JS_POST_MESSAGE_TO_PROVIDER(msg, origin);
		this._window && this._window.injectJavaScript(js);
	}
}

 export class BackgroundBridge {


	constructor(webview){
		this._webviewRef = webview && webview.current;
		this.provider =  Engine.context.NetworkController.provider;
		this.blockTracker = Engine.context.NetworkController.blockTracker;
		this.port = new Port(this._webviewRef);

		const senderUrl = new URL(this._webviewRef.props.source.uri);

		const portStream = new MobilePortStream(this.port);
		// setup multiplexing
		const mux = setupMultiplex(portStream)
		// connect features
		const publicApi = this.setupPublicApi(mux.createStream('publicApi'))
		this.setupProviderConnection(mux.createStream('provider'), senderUrl, publicApi)

	}

	onMessage = (msg) => {
		console.log('BGBridge::onMessage', msg);
		this.port.emit('message', {name: msg.name, data: msg.data })
	}

	onDisconnect = () => {
		this.port.emit('disconnect', {name: this.port.name, data: null });
	}

	setupPublicApi (outStream) {
		const dnode = Dnode()
		// connect dnode api to remote connection
		pump(
			outStream,
			dnode,
			outStream,
			(err) => {
				// report any error
				if (err) console.warn(err)
			}
		)

		const getRemote = createDnodeRemoteGetter(dnode)

		const publicApi = {
			// wrap with an await remote
			getSiteMetadata: async () => {
				const remote = await getRemote()
				return await pify(remote.getSiteMetadata)()
			},
		}

		return publicApi
	}

	/**
	 * A method for serving our ethereum provider over a given stream.
	 * @param {*} outStream - The stream to provide over.
	 * @param {URL} senderUrl - The URI of the requesting resource.
	 * @param {string} extensionId - The id of the extension, if the requesting
	 * resource is an extension.
	 * @param {object} publicApi - The public API
	 */
	setupProviderConnection (outStream, senderUrl, publicApi) {
		const getSiteMetadata = publicApi && publicApi.getSiteMetadata
		const engine = this.setupProviderEngine(senderUrl, getSiteMetadata)

		// setup connection
		const providerStream = createEngineStream({ engine })

		pump(
			outStream,
			providerStream,
			outStream,
			(err) => {
				// handle any middleware cleanup
				engine._middleware.forEach((mid) => {
				if (mid.destroy && typeof mid.destroy === 'function') {
					mid.destroy()
				}
				})
				if (err) console.warn(err)
			}
		)
	}

	/**
	 * A method for creating a provider that is safely restricted for the requesting domain.
	 **/
	setupProviderEngine (senderUrl, getSiteMetadata) {
		const origin = senderUrl.hostname
		// setup json rpc engine stack
		const engine = new RpcEngine()
		const provider = this.provider

		const blockTracker = this.blockTracker

		// create filter polyfill middleware
		const filterMiddleware = createFilterMiddleware({ provider, blockTracker })

		// create subscription polyfill middleware
		const subscriptionManager = createSubscriptionManager({ provider, blockTracker })
		subscriptionManager.events.on('notification', (message) => engine.emit('notification', message))

		// metadata
		engine.push(createOriginMiddleware({ origin }))
		engine.push(createLoggerMiddleware({ origin }))
		// filter and subscription polyfills
		engine.push(filterMiddleware)
		engine.push(subscriptionManager.middleware)
		// watch asset

		// MISSING
		//engine.push(this.preferencesController.requestWatchAsset.bind(this.preferencesController))

		// requestAccounts
		// MISSING
		// engine.push(this.providerApprovalController.createMiddleware({
		// 	senderUrl,
		// 	extensionId,
		// 	getSiteMetadata,
		// }))


		// forward to metamask primary provider
		engine.push(providerAsMiddleware(provider))
		return engine
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
	//  * Creates a new BackgroundBridge instance
	//  *
	//  * @param {Engine} engine - An Engine instance
	//  * @param {object} webview - React ref pointing to a WebView
	//  * @param {object} rpcOverrides - Map of rpc method overrides
	//  */
	// constructor(engine, webview, rpcOverrides) {
	// 	this._engine = engine;
	// 	this._rpcOverrides = rpcOverrides;
	// 	this._webview = webview;
	// 	engine.context.NetworkController.subscribe(this.sendStateUpdate);
	// 	engine.context.PreferencesController.subscribe(this.sendStateUpdate);
	// }

	// /**
	//  * Called when a new message is received from the InpageBridge
	//  *
	//  * @param {string} type - Type associated with this message
	//  * @param {object} payload - Data sent with this message
	//  */
	// onMessage({ type, payload, origin }) {
	// 	switch (type) {
	// 		case 'INPAGE_REQUEST':
	// 			this._onInpageRequest(payload, origin);
	// 			break;
	// 	}
	// }

	// /**
	//  * Sends updated state to the InpageBridge provider
	//  */
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
	//  * Called to disable inpage account updates
	//  */
	// disableAccounts() {
	// 	this._accounts = false;
	// }

	// /**
	//  * Called to enable inpage account updates
	//  */
	// enableAccounts() {
	// 	if (!this._accounts) {
	// 		this._accounts = true;
	// 		this.sendStateUpdate();
	// 	}
	// }
}

export default BackgroundBridge;
