import BackgroundBridge from './BackgroundBridge';

const MOCK_ENGINE = {
	datamodel: {
		flatState: {
			selectedAddress: 'foo',
			network: 'bar'
		}
	},
	api: {
		network: {
			provider: {
				sendAsync(payload, callback) {
					callback(undefined, true);
				}
			},
			subscribe(callback) {
				callback(true);
			}
		},
		preferences: {
			subscribe(callback) {
				callback(true);
			}
		}
	}
};

const MOCK_WEBVIEW = {
	current: {
		postMessage() {
			/* eslint-disable-line no-empty */
		}
	}
};

describe('BackgroundBridge', () => {
	it('should subscribe to network store', () => {
		const { network, preferences } = MOCK_ENGINE.api;
		const stub1 = spyOn(network, 'subscribe');
		const stub2 = spyOn(preferences, 'subscribe');
		new BackgroundBridge(MOCK_ENGINE);
		expect(stub1).toBeCalled();
		expect(stub2).toBeCalled();
	});

	it('should relay response from provider', () => {
		const bridge = new BackgroundBridge(MOCK_ENGINE, MOCK_WEBVIEW);
		bridge.onMessage({ type: 'FOO' });
		const stub = spyOn(MOCK_WEBVIEW.current, 'postMessage');
		bridge.onMessage({ type: 'INPAGE_REQUEST', payload: { method: 'net_version' } });
		expect(stub).toBeCalledWith(JSON.stringify({ type: 'INPAGE_RESPONSE', payload: { response: true } }));
	});

	it('should emit state update', () => {
		const stub = spyOn(MOCK_WEBVIEW.current, 'postMessage');
		new BackgroundBridge(MOCK_ENGINE, MOCK_WEBVIEW);
		expect(stub).toBeCalledWith({
			payload: {
				network: 'bar',
				selectedAddress: 'foo'
			},
			type: 'STATE_UPDATE'
		});
	});
});
