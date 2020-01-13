import BackgroundBridge from './BackgroundBridge';

const MOCK_ENGINE = {
	datamodel: {
		flatState: {
			selectedAddress: 'foo',
			network: 'bar'
		}
	},
	context: {
		NetworkController: {
			provider: {
				sendAsync(payload, callback) {
					callback(undefined, true);
				}
			},
			subscribe(callback) {
				callback(true);
			}
		},
		PreferencesController: {
			subscribe(callback) {
				callback(true);
			}
		}
	}
};

const MOCK_WEBVIEW = {
	current: {
		injectJavaScript() {
			/* eslint-disable-line no-empty */
		}
	}
};

describe('BackgroundBridge', () => {
	it('should subscribe to network store', () => {
		const { NetworkController, PreferencesController } = MOCK_ENGINE.context;
		const stub1 = spyOn(NetworkController, 'subscribe');
		const stub2 = spyOn(PreferencesController, 'subscribe');
		new BackgroundBridge(MOCK_ENGINE);
		expect(stub1).toBeCalled();
		expect(stub2).toBeCalled();
	});

	it('should relay response from provider', () =>
		new Promise(resolve => {
			const bridge = new BackgroundBridge(MOCK_ENGINE, MOCK_WEBVIEW);
			const stub = spyOn(MOCK_WEBVIEW.current, 'injectJavaScript');
			const origin = 'localhost';
			bridge.onMessage({ type: 'INPAGE_REQUEST', payload: { method: 'net_version' }, origin });
			setTimeout(() => {
				expect(stub).toBeCalled();
				resolve();
			}, 250);
		}));

	it('should emit state update', () => {
		const stub = spyOn(MOCK_WEBVIEW.current, 'injectJavaScript');
		new BackgroundBridge(MOCK_ENGINE, MOCK_WEBVIEW);
		expect(stub).toBeCalled();
	});
});
