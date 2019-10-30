import React, { PureComponent } from 'react';
import { WebView } from 'react-native-webview';
import byteArrayToHex from '../../util/bytes';
import Engine from '../Engine';
import Logger from '../../util/Logger';

class Web3Box extends PureComponent {
	state = {
		status: 'opening_box',
		address: null,
		ready: false,
		result: undefined,
		error: false
	};

	promises = [];

	componentDidUpdate(prevProps, prevState) {
		if (prevState.status !== this.state.status && this.state.status !== 'idle') {
			const promise = this.promises.pop();
			if (this.state.error) {
				(this.state.result && promise.reject(this.state.result)) || promise.reject();
			} else {
				(this.state.result && promise.resolve(this.state.result)) || promise.resolve();
			}
			this.resetResults();
		}
	}

	webview = React.createRef();

	resetResults = () => {
		this.setState({ result: undefined, error: false });
	};

	onMessage = async ({ nativeEvent: { data } }) => {
		try {
			data = typeof data === 'string' ? JSON.parse(data) : data;
			const { payload, type } = data;
			if (type === 'PROVIDER') {
				if (payload && payload.method === 'personal_sign') {
					const { KeyringController } = Engine.context;
					const message = payload.params[0];
					const hexMessage = byteArrayToHex(message);
					const rawSig = await KeyringController.signPersonalMessage({
						data: hexMessage,
						from: this.state.address
					});
					delete payload.params;
					this.postMessageToProvider({
						...payload,
						response: {
							result: rawSig
						}
					});
				} else if (payload && payload.method === 'eth_chainId') {
					delete payload.params;
					this.postMessageToProvider({
						...payload,
						response: {
							result: '0x04'
						}
					});
				} else if (payload && payload.method === 'eth_getCode') {
					delete payload.params;
					this.postMessageToProvider({
						...payload,
						response: {
							result: '0x'
						}
					});
				} else {
					delete payload.params;
					this.postMessageToProvider({
						...payload,
						error: {
							code: -32601,
							message: `The method ${payload.method} does not exist/is not available`
						}
					});
				}
			} else if (type === 'STATE_UPDATE') {
				this.setState(payload);
			}
		} catch (e) {
			Logger.log(e);
		}
	};

	postMessageToProvider = msg => {
		const current = this.webview.current;
		current &&
			current.injectJavaScript(`
				window.ethereum && window.ethereum._onMessage(${JSON.stringify(msg)})
			`);
	};

	openSpace = async space => {
		const promise = new Promise((res, rej) => {
			const current = this.webview.current;
			current &&
				current.injectJavaScript(`(function () {
				window.openSpace('${space}');
			})()`);
			this.promises.push({ resolve: res, reject: rej });
		});

		return promise;
	};

	openBox = async address => {
		this.setState({ address });
		const promise = new Promise((res, rej) => {
			const current = this.webview.current;
			current &&
				current.injectJavaScript(`(function () {
				window.openBox('${address}');
			})()`);
			this.promises.push({ resolve: res, reject: rej });
		});

		return promise;
	};

	publicSetSpace = (key, val) => {
		const promise = new Promise((res, rej) => {
			const current = this.webview.current;
			current &&
				current.injectJavaScript(`
				(function () {
					window.spacePublicSet('${key}','${val}');
				})()
			`);
			this.promises.push({ resolve: res, reject: rej });
		});

		return promise;
	};

	publicGetSpace = key => {
		const promise = new Promise((res, rej) => {
			const current = this.webview.current;
			current &&
				current.injectJavaScript(`
				(function () {
					window.spacePublicGet('${key}');
				})()
			`);
			this.promises.push({ resolve: res, reject: rej });
		});

		return promise;
	};

	privateSetSpace = (key, val) => {
		const promise = new Promise((res, rej) => {
			const current = this.webview.current;
			current &&
				current.injectJavaScript(`
				(function () {
					window.spacePrivateSet('${key}','${val}');
				})()
			`);
			this.promises.push({ resolve: res, reject: rej });
		});

		return promise;
	};

	privateGetSpace = key => {
		const promise = new Promise((res, rej) => {
			const current = this.webview.current;
			current &&
				current.injectJavaScript(`
				(function () {
					window.spacePrivateGet('${key}');
				})()
			`);
			this.promises.push({ resolve: res, reject: rej });
		});

		return promise;
	};

	privateRemoveSpace = key => {
		const promise = new Promise((res, rej) => {
			const current = this.webview.current;
			current &&
				current.injectJavaScript(`
				(function () {
					window.spacePrivateRemove('${key}');
				})()
			`);
			this.promises.push({ resolve: res, reject: rej });
		});

		return promise;
	};

	publicRemoveSpace = key => {
		const promise = new Promise((res, rej) => {
			const current = this.webview.current;
			current &&
				current.injectJavaScript(`
				(function () {
					window.spacePublicRemove('${key}');
				})()
			`);
			this.promises.push({ resolve: res, reject: rej });
		});

		return promise;
	};

	onLoadEnd = () => {
		this.setState({ ready: true });
	};

	render() {
		return (
			<WebView
				ref={this.webview}
				// eslint-disable-next-line react-native/no-inline-styles
				style={{ flex: 1 }}
				source={{ uri: 'https://brunobar79.github.io/metamask-3box/' }}
				javaScriptEnabled
				bounces={false}
				scrollEnabled={false}
				onMessage={this.onMessage}
				onLoadEnd={this.onLoadEnd}
				injectedJavaScript={`
					console.log('ready')
				`}
			/>
		);
	}
}

export default Web3Box;
