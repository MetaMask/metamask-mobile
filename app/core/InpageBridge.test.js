let INSTANCE;
let LISTENER;

describe('InpageBridge', () => {
	beforeAll(() => {
		global.window = {
			postMessage: jest.fn(),
			ReactNativeWebView: {
				postMessage: jest.fn()
			},
			addEventListener: jest.fn()
		};

		global.document = {
			addEventListener(type, callback) {
				LISTENER = callback;
			}
		};

		Object.defineProperty(window, 'ethereum', {
			set(instance) {
				expect(instance).toBeDefined();
				INSTANCE = instance;
			},
			get: () => ({})
		});
		require('./InpageBridge');
	});

	it('should set internal state', () => {
		LISTENER({
			data: JSON.stringify({
				type: 'STATE_UPDATE',
				payload: {
					selectedAddress: 'foo',
					network: 'bar'
				}
			})
		});
		expect(INSTANCE.send({ method: 'eth_coinbase' }).result).toBe('foo');
	});

	it('should return current account', () => {
		LISTENER({
			data: JSON.stringify({
				type: 'STATE_UPDATE',
				payload: {
					selectedAddress: undefined,
					network: 'bar'
				}
			})
		});
		expect(INSTANCE.send({ method: 'eth_accounts' }).result).toEqual([]);
		LISTENER({
			data: JSON.stringify({
				type: 'STATE_UPDATE',
				payload: {
					selectedAddress: 'foo',
					network: 'bar'
				}
			})
		});
		expect(INSTANCE.send({ method: 'eth_accounts' }).result).toEqual(['foo']);
	});

	it('should return current network', () => {
		LISTENER({
			data: JSON.stringify({
				type: 'STATE_UPDATE',
				payload: {
					selectedAddress: 'foo',
					network: 'bar'
				}
			})
		});
		expect(INSTANCE.send({ method: 'net_version' }).result).toBe('bar');
	});

	it('should throw for unrecognized synchronous method', () => {
		expect(() => {
			INSTANCE.send({ method: 'foo' });
		}).toThrow();
	});

	it('should forward asynchronous RPC request', () => {
		global.window.location = { hostname: 'hostname' };
		const stub = spyOn(global.window.ReactNativeWebView, 'postMessage');
		INSTANCE.sendAsync({ method: 'foo' }, () => {
			/* eslint-disable-line no-empty */
		});
		expect(stub).toBeCalled();
	});

	it('should return current network', () => {
		const stub = spyOn(INSTANCE, 'sendAsync');
		INSTANCE.send({ method: 'eth_uninstallFilter' });
		expect(stub).toBeCalled();
	});

	// it('should call listener from background message', () => {
	// 	const mock = jest.fn();
	// 	INSTANCE.sendAsync({ method: 'foo' }, mock);
	// 	const pendingKeys = Object.keys(INSTANCE._pending);
	// 	LISTENER({
	// 		data: JSON.stringify({
	// 			type: 'INPAGE_RESPONSE',
	// 			payload: {
	// 				__mmID: pendingKeys[pendingKeys.length - 1],
	// 				error: 'error',
	// 				response: 'response'
	// 			}
	// 		})
	// 	});
	// 	expect(mock).toBeCalled();
	// });
});
