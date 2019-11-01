import React, { PureComponent } from 'react';
import { WebView } from 'react-native-webview';
import Engine from '../Engine';
import Logger from '../../util/Logger';
import { baseStyles } from '../../styles/common';
import { normalizeMessageData } from 'gaba/util';

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

	componentDidMount = () => {
		const allKeyrings = Engine.context.KeyringController.state.keyrings;
		const accountsOrdered = allKeyrings.reduce((list, keyring) => list.concat(keyring.accounts), []);
		this.setState({ address: accountsOrdered[0].toLowerCase() });
	};

	onMessage = async ({ nativeEvent: { data } }) => {
		try {
			data = typeof data === 'string' ? JSON.parse(data) : data;
			const { payload, type } = data;
			if (type === 'PROVIDER') {
				if (payload && payload.method === 'personal_sign') {
					const { KeyringController } = Engine.context;
					try {
						const params = {
							data: payload.params[0],
							from: this.state.address
						};

						params.data = normalizeMessageData(params.data);
						const rawSig = await KeyringController.signPersonalMessage(params);

						this.postMessageToProvider({
							...payload,
							response: {
								result: rawSig
							}
						});
					} catch (error) {
						return (
							!this.isReloading &&
							Promise.reject({ error: error.message, jsonrpc: payload.jsonrpc, id: payload.id })
						);
					}
				} else if (payload && (payload.method === 'eth_chainId' || payload.method === 'net_version')) {
					delete payload.params;
					const { NetworkController } = Engine.context;
					let result = NetworkController.state.network;
					if (payload.method === 'eth_chainId') {
						result =
							'0x' +
							Number(NetworkController.state.network)
								.toString(16)
								.padStart(2, '0');
					}

					console.log('RETURNING', result, payload.method);

					this.postMessageToProvider({
						...payload,
						response: {
							result
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

	openSpace = space => {
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

	openBox = () => {
		const promise = new Promise((res, rej) => {
			const current = this.webview.current;
			current &&
				current.injectJavaScript(`(function () {
				window.openBox();
			})()`);
			this.promises.push({ resolve: res, reject: rej });
		});

		return promise;
	};

	publicSetBox = (key, val) => {
		const promise = new Promise((res, rej) => {
			const current = this.webview.current;
			current &&
				current.injectJavaScript(`
				(function () {
					window.boxPublicSet('${key}','${val}');
				})()
			`);
			this.promises.push({ resolve: res, reject: rej });
		});

		return promise;
	};

	publicGetBox = key => {
		const promise = new Promise((res, rej) => {
			const current = this.webview.current;
			current &&
				current.injectJavaScript(`
				(function () {
					window.boxPublicGet('${key}');
				})()
			`);
			this.promises.push({ resolve: res, reject: rej });
		});

		return promise;
	};

	privateSetBox = (key, val) => {
		const promise = new Promise((res, rej) => {
			const current = this.webview.current;
			current &&
				current.injectJavaScript(`
				(function () {
					window.boxPrivateSet('${key}','${val}');
				})()
			`);
			this.promises.push({ resolve: res, reject: rej });
		});

		return promise;
	};

	privateGetBox = key => {
		const promise = new Promise((res, rej) => {
			const current = this.webview.current;
			current &&
				current.injectJavaScript(`
				(function () {
					window.boxPrivateGet('${key}');
				})()
			`);
			this.promises.push({ resolve: res, reject: rej });
		});

		return promise;
	};

	privateRemoveBox = key => {
		const promise = new Promise((res, rej) => {
			const current = this.webview.current;
			current &&
				current.injectJavaScript(`
				(function () {
					window.boxPrivateRemove('${key}');
				})()
			`);
			this.promises.push({ resolve: res, reject: rej });
		});

		return promise;
	};

	publicRemoveBox = key => {
		const promise = new Promise((res, rej) => {
			const current = this.webview.current;
			current &&
				current.injectJavaScript(`
				(function () {
					window.boxPublicRemove('${key}');
				})()
			`);
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
		const current = this.webview.current;
		current &&
			current.injectJavaScript(`

		const setStatus = (msg) => {
			console.log(msg);
		}

		window.toNative = function(msg){
			window.ReactNativeWebView.postMessage(
					JSON.stringify(msg)
			);
		  };

		  window.ethereumPendingCallbacks = {};
		  window.ethereum = {
			send: (payload, callback) => {
				alert('Called send!');
			},
			sendAsync: (payload, callback) => {
				if (!window.ReactNativeWebView.postMessage) {
					alert('Bridge not ready');
				}

				const random = Math.floor(Math.random() * 100 + 1);

				const fullPayload = {
					...payload,
					__mmID: (Date.now() * random).toString(),
					hostname: window.location.hostname
				};

				window.ethereumPendingCallbacks[fullPayload.__mmID] = callback;
				window.toNative({
					payload: fullPayload,
					type: 'PROVIDER'
				});
			},
			_onMessage: (data) =>{
				try {
					const payload = typeof data === 'string' ? JSON.parse(data) : data;
					const { __mmID, error, response } = payload;
					const callback = window.ethereumPendingCallbacks[__mmID];
					callback && callback(error, response);
					delete window.ethereumPendingCallbacks[__mmID];
				} catch (error) {
					alert(error.toString()); // eslint-disable-line no-console
				}
			},
			isMetaMask: true,
			selectedAddress: "${this.state.address}",
			_selectedAddress: "${this.state.address}",
			_metaMask: {
				isApproved : () => true,
				isUnlocked : () => true,
				isEnabled : () => true,
			},
			enable: () => {
				return Promise.resolve("${this.state.address}");
			}
		  }

		 // Box methods

		 window.openBox = async () => {
				setStatus('Opening box ' + "${this.state.address}");
				window.Box.openBox("${this.state.address}", window.ethereum, {}).then(box => {
					window.box = box;
					box.onSyncDone((res) => {
						console.log('Sync Complete');
						window.toNative({
							payload: {
								status: 'box_open'
							},
							type: 'STATE_UPDATE'
						});
						setStatus('Box open');
					})
				}).catch( e => {
				  console.log('something broke', e);
				  window.toNative({
					  payload: {
						  status: 'box_open',
						  error: true,
						  result: e.toString()
					  },
					  type: 'STATE_UPDATE'
				  });
				  return false;
				});

				setStatus('Syncing box...');
				return true;
		  }

		  window.boxPublicSet = async (key, value) => {
			try{
				window.toNative({
					payload: {
						status: 'idle'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Public box writing " + key + " => " + value);

				await window.box.public.set(key, value);

				window.toNative({
					payload: {
						status: 'public_box_write_end'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Public box wrote " + key + " => " + value);

			} catch(e){
				console.log('something broke', e);
				window.toNative({
					payload: {
						status: 'public_box_write_end',
						error: true,
						result: e.toString()
					},
					type: 'STATE_UPDATE'
				});
				return false;
			}
		}

		window.boxPublicGet = async (key) => {
			try{
				window.toNative({
					payload: {
						status: 'idle'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Public box getting " + key);

				const value = await window.box.public.get(key);

				window.toNative({
					payload: {
						status: 'public_box_get_end',
						result: value
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Public box got " + key + " => " + value);

			} catch(e){
				console.log('something broke', e);
				window.toNative({
					payload: {
						status: 'public_box_get_end',
						error: true,
						result: e.toString()
					},
					type: 'STATE_UPDATE'
				});
				return false;
			}
		}

		window.boxPrivateSet = async (key, value) => {
			try{
				window.toNative({
					payload: {
						status: 'idle'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Private box writing " + key + " => " + value);

				await window.box.private.set(key, value);

				window.toNative({
					payload: {
						status: 'private_box_write_end'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Private box wrote " + key + " => "+ value);

			} catch(e){
				console.log('something broke', e);
				window.toNative({
					payload: {
						status: 'private_box_write_end',
						error: true,
						result: e.toString()
					},
					type: 'STATE_UPDATE'
				});
				return false;
			}
		}

		window.boxPrivateGet = async (key) => {
			try{
				window.toNative({
					payload: {
						status: 'idle'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Private box getting " + key);

				const value = await window.box.private.get(key);

				window.toNative({
					payload: {
						status: 'private_box_get_end',
						result: value
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Private box got " + key + " => " + value);

			} catch(e){
				console.log('something broke', e);
				window.toNative({
					payload: {
						status: 'private_box_get_end',
						error: true,
						result: e.toString()
					},
					type: 'STATE_UPDATE'
				});
				return false;
			}
		}

		window.boxPublicRemove = async (key) => {
			try{
				window.toNative({
					payload: {
						status: 'idle'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Public box removing " + key);

				await window.box.public.remove(key);

				window.toNative({
					payload: {
						status: 'public_box_remove_end'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Public box removed " + key);

			} catch(e){
				console.log('something broke', e);
				window.toNative({
					payload: {
						status: 'public_box_remove_end',
						error: true,
						result: e.toString()
					},
					type: 'STATE_UPDATE'
				});
				return false;
			}
		}

		window.boxPrivateRemove = async (key) => {
			try{
				window.toNative({
					payload: {
						status: 'idle'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Private box removing " + key);

				const value = await window.box.private.remove(key);

				window.toNative({
					payload: {
						status: 'private_box_remove_end'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Private box removed " + key);

			} catch(e){
				console.log('something broke', e);
				window.toNative({
					payload: {
						status: 'private_box_remove_end',
						error: true,
						result: e.toString()
					},
					type: 'STATE_UPDATE'
				});
				return false;
			}
		}

		// SPACES START HERE

		window.openSpace = async (spaceName) => {
			try{
				setStatus("Opening space " + spaceName);
				window.space = await window.box.openSpace(spaceName, {
					onSyncDone: () => {
						setStatus('Space synced');
					}
				});
				window.toNative({
					payload: {
						status: 'space_open'
					},
					type: 'STATE_UPDATE'
				});
				setStatus('Space open');
				return true;
			} catch(e){
				console.log('something broke', e);
				window.toNative({
					payload: {
						status: 'space_open',
						error: true,
						result: e.toString()
					},
					type: 'STATE_UPDATE'
				});
				return false;
			}
		  }

		  window.spacePublicSet = async (key, value) => {
			try{
				window.toNative({
					payload: {
						status: 'idle'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Public space writing " + key + " => " + value);

				await window.space.public.set(key, value);

				window.toNative({
					payload: {
						status: 'public_write_end'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Public space wrote " + key + " => " + value);

			} catch(e){
				console.log('something broke', e);
				window.toNative({
					payload: {
						status: 'public_write_end',
						error: true,
						result: e.toString()
					},
					type: 'STATE_UPDATE'
				});
				return false;
			}
		  }

		  window.spacePublicGet = async (key) => {
			try{
				window.toNative({
					payload: {
						status: 'idle'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Public space getting " + key);

				const value = await window.space.public.get(key);

				window.toNative({
					payload: {
						status: 'public_get_end',
						result: value
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Public space got " + key + " => " + value);

			} catch(e){
				console.log('something broke', e);
				window.toNative({
					payload: {
						status: 'public_get_end',
						error: true,
						result: e.toString()
					},
					type: 'STATE_UPDATE'
				});
				return false;
			}
		  }

		  window.spacePrivateSet = async (key, value) => {
			try{
				window.toNative({
					payload: {
						status: 'idle'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Private space writing " + key + " => " + value);

				await window.space.private.set(key, value);

				window.toNative({
					payload: {
						status: 'private_write_end'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Private space wrote " + key + " => "+ value);

			} catch(e){
				console.log('something broke', e);
				window.toNative({
					payload: {
						status: 'private_write_end',
						error: true,
						result: e.toString()
					},
					type: 'STATE_UPDATE'
				});
				return false;
			}
		  }

		  window.spacePrivateGet = async (key) => {
			try{
				window.toNative({
					payload: {
						status: 'idle'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Private space getting " + key);

				const value = await window.space.private.get(key);

				window.toNative({
					payload: {
						status: 'private_get_end',
						result: value
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Private space got " + key + " => " + value);

			} catch(e){
				console.log('something broke', e);
				window.toNative({
					payload: {
						status: 'private_get_end',
						error: true,
						result: e.toString()
					},
					type: 'STATE_UPDATE'
				});
				return false;
			}
		  }

		  window.spacePublicRemove = async (key) => {
			try{
				window.toNative({
					payload: {
						status: 'idle'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Public space removing " + key);

				await window.space.public.remove(key);

				window.toNative({
					payload: {
						status: 'public_remove_end'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Public space removed " + key);

			} catch(e){
				console.log('something broke', e);
				window.toNative({
					payload: {
						status: 'public_remove_end',
						error: true,
						result: e.toString()
					},
					type: 'STATE_UPDATE'
				});
				return false;
			}
		  }

		  window.spacePrivateRemove = async (key) => {
			try{
				window.toNative({
					payload: {
						status: 'idle'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Private space removing " + key);

				const value = await window.space.private.remove(key);

				window.toNative({
					payload: {
						status: 'private_remove_end'
					},
					type: 'STATE_UPDATE'
				});

				setStatus("Private space removed " + key);

			} catch(e){
				console.log('something broke', e);
				window.toNative({
					payload: {
						status: 'private_remove_end',
						error: true,
						result: e.toString()
					},
					type: 'STATE_UPDATE'
				});
				return false;
			}
		  }
		  true;
		`);

		this.setState({ ready: true });
	};

	render() {
		return (
			<WebView
				ref={this.webview}
				// eslint-disable-next-line react-native/no-inline-styles
				style={baseStyles.flexGrow}
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
