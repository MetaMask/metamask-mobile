import React, { Component } from 'react';
import {
	Text,
	ActivityIndicator,
	Platform,
	StyleSheet,
	TextInput,
	View,
	TouchableWithoutFeedback,
	AsyncStorage,
	Alert,
	Animated,
	SafeAreaView,
	TouchableOpacity
} from 'react-native';
import Web3Webview from 'react-native-web3-webview';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import RNFS from 'react-native-fs';
import Share from 'react-native-share'; // eslint-disable-line  import/default
import { connect } from 'react-redux';
import BackgroundBridge from '../../core/BackgroundBridge';
import Engine from '../../core/Engine';
import { getBrowserViewNavbarOptions } from '../Navbar';
import WebviewProgressBar from '../WebviewProgressBar';
import { colors, baseStyles, fontStyles } from '../../styles/common';
import Networks from '../../util/networks';
import Logger from '../../util/Logger';
import resolveEnsToIpfsContentId from '../../lib/ens-ipfs/resolver';
import Button from '../Button';
import { strings } from '../../../locales/i18n';
import URL from 'url-parse';
import Modal from 'react-native-modal';

const SUPPORTED_TOP_LEVEL_DOMAINS = ['eth'];
const SCROLL_THRESHOLD = 100;

const styles = StyleSheet.create({
	wrapper: {
		...baseStyles.flexGrow,
		backgroundColor: colors.concrete
	},
	icon: {
		color: colors.tar,
		height: 28,
		lineHeight: 28,
		textAlign: 'center',
		width: 36,
		alignSelf: 'center'
	},
	disabledIcon: {
		color: colors.ash
	},
	progressBarWrapper: {
		height: 3,
		marginTop: 0
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	optionsOverlay: {
		position: 'absolute',
		zIndex: 99999998,
		top: 0,
		bottom: 0,
		left: 0,
		right: 0
	},
	optionsWrapper: {
		position: 'absolute',
		zIndex: 99999999,
		width: 140,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor,
		backgroundColor: colors.concrete
	},
	optionsWrapperAndroid: {
		top: 0,
		right: 0,
		elevation: 5
	},
	optionsWrapperIos: {
		shadowColor: colors.gray,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.5,
		shadowRadius: 3,
		bottom: 70,
		right: 3
	},
	option: {
		backgroundColor: colors.concrete,
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'flex-start'
	},
	optionText: {
		fontSize: 14,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	optionIcon: {
		width: 18,
		color: colors.tar,
		flex: 0,
		height: 15,
		lineHeight: 15,
		marginRight: 10,
		textAlign: 'center',
		alignSelf: 'center'
	},
	webview: {
		...baseStyles.flexGrow
	},
	bottomBar: {
		flexDirection: 'row',
		paddingTop: 10,
		paddingHorizontal: 10
	},
	iconMore: {
		alignSelf: 'flex-end',
		alignContent: 'flex-end'
	},
	iconsLeft: {
		flex: 1,
		alignContent: 'flex-start',
		flexDirection: 'row'
	},
	iconsRight: {
		flex: 1,
		alignContent: 'flex-end'
	},
	urlModalContent: {
		flexDirection: 'row',
		paddingTop: Platform.OS === 'android' ? 10 : 50,
		paddingHorizontal: 10,
		backgroundColor: colors.white,
		height: Platform.OS === 'android' ? 59 : 87
	},
	urlModal: {
		justifyContent: 'flex-start',
		margin: 0
	},
	urlInput: {
		...fontStyles.normal,
		backgroundColor: Platform.OS === 'android' ? colors.white : colors.slate,
		borderRadius: 30,
		fontSize: Platform.OS === 'android' ? 16 : 14,
		padding: 8,
		paddingLeft: 15,
		textAlign: 'left',
		flex: 1,
		height: Platform.OS === 'android' ? 40 : 30
	},
	cancelButton: {
		marginTop: 7,
		marginLeft: 10
	},
	cancelButtonText: {
		fontSize: 14,
		color: colors.primary,
		...fontStyles.normal
	},
	iconCloseButton: {
		borderRadius: 300,
		backgroundColor: colors.fontSecondary,
		color: colors.white,
		fontSize: 18,
		padding: 0,
		height: 20,
		width: 20,
		paddingBottom: 0,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 10,
		marginRight: 5
	},
	iconClose: {
		color: colors.white,
		fontSize: 18
	}
});

/**
 * Complete Web browser component with URL entry and history management
 */
export class Browser extends Component {
	static navigationOptions = ({ navigation }) => getBrowserViewNavbarOptions(navigation);

	static defaultProps = {
		defaultProtocol: 'https://'
	};

	static propTypes = {
		/**
		 * Protocol string to append to URLs that have none
		 */
		defaultProtocol: PropTypes.string,
		/**
		 * react-navigation object used to switch between screens
		 */
		navigation: PropTypes.object,
		/**
		 * Url coming from an external source
		 * For ex. deeplinks
		 */
		url: PropTypes.string
	};

	state = {
		approvedOrigin: false,
		canGoBack: false,
		canGoForward: false,
		entryScriptWeb3: null,
		bookmarks: [],
		inputValue: '',
		hostname: '',
		url: this.props.url || '',
		currentPageTitle: '',
		timeout: false,
		ipfsWebsite: false,
		ipfsGateway: 'https://ipfs.io/ipfs/',
		ipfsHash: null,
		currentEnsName: null,
		editMode: false,
		loading: true
	};

	webview = React.createRef();
	inputRef = React.createRef();
	scrollY = new Animated.Value(0);
	timeoutHandler = null;
	prevScrollOffset = 0;

	async componentDidMount() {
		this.backgroundBridge = new BackgroundBridge(Engine, this.webview);

		const entryScriptWeb3 =
			Platform.OS === 'ios'
				? await RNFS.readFile(`${RNFS.MainBundlePath}/InpageBridgeWeb3.js`, 'utf8')
				: await RNFS.readFileAssets(`InpageBridgeWeb3.js`);

		const { networkType, selectedAddress } = this.props;

		const updatedentryScriptWeb3 = entryScriptWeb3
			.replace('INITIAL_NETWORK', Networks[networkType].networkId.toString())
			.replace('INITIAL_SELECTED_ADDRESS', selectedAddress);

		await this.setState({ entryScriptWeb3: updatedentryScriptWeb3 });

		Engine.context.TransactionController.hub.on('unapprovedTransaction', transactionMeta => {
			this.props.navigation.push('Approval', { transactionMeta });
		});
		this.loadUrl();
		this.loadBookmarks();
	}

	loadBookmarks = async () => {
		const bookmarks = this.props.navigation.getParam('bookmarks', null);
		if (bookmarks) {
			this.setState({ bookmarks });
		}
	};

	async loadUrl() {
		const { navigation } = this.props;
		if (navigation) {
			const url = navigation.getParam('url', null);
			if (url) {
				await this.go(url);
				this.setState({ loading: false });
			}
		}
	}

	componentDidUpdate(prevProps) {
		const prevNavigation = prevProps.navigation;
		const { navigation } = this.props;

		if (prevNavigation && navigation) {
			const prevUrl = prevNavigation.getParam('url', null);
			const currentUrl = navigation.getParam('url', null);

			if (currentUrl && prevUrl !== currentUrl && currentUrl !== this.state.url) {
				this.loadUrl();
			}
		}
	}

	isENSUrl(url) {
		const urlObj = new URL(url);
		const { hostname } = urlObj;
		const tld = hostname.split('.').pop();
		if (SUPPORTED_TOP_LEVEL_DOMAINS.indexOf(tld.toLowerCase()) !== -1) {
			return true;
		}
		return false;
	}

	go = async url => {
		const hasProtocol = url.match(/^[a-z]*:\/\//);
		const sanitizedURL = hasProtocol ? url : `${this.props.defaultProtocol}${url}`;
		const urlObj = new URL(sanitizedURL);
		const { hostname, query, pathname } = urlObj;

		let ipfsContent = null;
		let currentEnsName = null;
		let ipfsHash = null;

		if (this.isENSUrl(sanitizedURL)) {
			ipfsContent = await this.handleIpfsContent(sanitizedURL, { hostname, query, pathname });

			if (ipfsContent) {
				const urlObj = new URL(sanitizedURL);
				currentEnsName = urlObj.hostname;
				ipfsHash = ipfsContent
					.replace(this.state.ipfsGateway, '')
					.split('/')
					.shift();
			}
		}

		const urlToGo = ipfsContent || sanitizedURL;
		this.setState({
			url: urlToGo,
			progress: 0,
			ipfsWebsite: !!ipfsContent,
			inputValue: sanitizedURL,
			currentEnsName,
			ipfsHash,
			hostname: this.formatHostname(hostname)
		});

		this.timeoutHandler && clearTimeout(this.timeoutHandler);
		this.timeoutHandler = setTimeout(() => {
			this.urlTimedOut(urlToGo);
		}, 60000);
		return sanitizedURL;
	};

	urlTimedOut(url) {
		Logger.log('Browser::url::Timeout!', url);
	}

	urlNotFound(url) {
		Logger.log('Browser::url::Not found!', url);
	}

	urlNotSupported(url) {
		Logger.log('Browser::url::Not supported!', url);
	}

	urlErrored(url) {
		Logger.log('Browser::url::Unknown error!', url);
	}

	async handleIpfsContent(fullUrl, { hostname, pathname, query }) {
		const { provider } = Engine.context.NetworkController;
		let ipfsHash;
		try {
			ipfsHash = await resolveEnsToIpfsContentId({ provider, name: hostname });
		} catch (err) {
			this.timeoutHandler && clearTimeout(this.timeoutHandler);
			Logger.error('Failed to resolve ENS name', err);
			err === 'unsupport' ? this.urlNotSupported(fullUrl) : this.urlErrored(fullUrl);
			return null;
		}

		const gatewayUrl = `${this.state.ipfsGateway}${ipfsHash}${pathname || '/'}${query || ''}`;

		try {
			const response = await fetch(gatewayUrl, { method: 'HEAD' });
			const statusCode = response.status;
			if (statusCode !== 200) {
				this.urlNotFound(gatewayUrl);
				return null;
			}
			return gatewayUrl;
		} catch (err) {
			// If there's an error our fallback mechanism is
			// to point straight to the ipfs gateway
			Logger.error('Failed to fetch ipfs website via ens', err);
			return `https://ipfs.io/ipfs/${ipfsHash}/`;
		}
	}

	onUrlInputSubmit = async () => {
		const url = await this.go(this.state.inputValue);
		this.hideUrlModal(url);
	};

	goBack = () => {
		this.toggleOptionsIfNeeded();
		if (this.state.canGoBack) {
			const { current } = this.webview;
			current && current.goBack();
		} else {
			this.props.navigation.pop();
		}
	};

	close = () => {
		this.toggleOptionsIfNeeded();
		this.props.navigation.pop();
	};

	goForward = () => {
		this.toggleOptionsIfNeeded();
		const { current } = this.webview;
		current && current.goForward();
	};

	reload = () => {
		this.toggleOptionsIfNeeded();
		const { current } = this.webview;
		current && current.reload();
	};

	bookmark = () => {
		this.toggleOptionsIfNeeded();
		// Check it doesn't exist already
		if (this.state.bookmarks.filter(i => i.url === this.state.inputValue).length) {
			Alert.alert(strings('browser.error'), strings('browser.bookmarkAlreadyExists'));
			return false;
		}

		this.props.navigation.push('AddBookmark', {
			title: this.state.currentPageTitle || '',
			url: this.state.inputValue,
			onAddBookmark: async ({ name, url }) => {
				const newBookmarks = this.state.bookmarks;
				newBookmarks.push({ name, url });
				this.setState({ bookmarks: newBookmarks });
				await AsyncStorage.setItem('@MetaMask:bookmarks', JSON.stringify(newBookmarks));
			}
		});
	};

	share = () => {
		this.toggleOptionsIfNeeded();
		Share.open({
			url: this.state.url
		}).catch(err => {
			Logger.log('Error while trying to share address', err);
		});
	};

	toggleOptionsIfNeeded() {
		if (this.props.navigation && this.props.navigation.state.params.showOptions) {
			this.toggleOptions();
		}
	}

	toggleOptions = () => {
		this.props.navigation &&
			this.props.navigation.setParams({
				...this.props.navigation.state.params,
				showOptions: !this.props.navigation.state.params.showOptions
			});
	};

	onMessage = ({ nativeEvent: { data } }) => {
		try {
			data = typeof data === 'string' ? JSON.parse(data) : data;

			if (!data || !data.type) {
				return;
			}
			switch (data.type) {
				case 'INPAGE_REQUEST':
					this.backgroundBridge.onMessage(data);
					break;
				case 'GET_TITLE_FOR_BOOKMARK':
					if (data.title) {
						this.setState({ currentPageTitle: data.title });
					}
					break;
			}
		} catch (e) {
			Logger.error(`Browser::onMessage on ${this.state.inputValue}`, e.toString());
		}
	};

	onPageChange = ({ canGoBack, canGoForward, url }) => {
		const data = { canGoBack, canGoForward };
		if (!this.state.ipfsWebsite) {
			data.inputValue = url;
		} else if (url.search('mm_override=false') === -1) {
			data.inputValue = url.replace(
				`${this.state.ipfsGateway}${this.state.ipfsHash}/`,
				`https://${this.state.currentEnsName}/`
			);
		} else if (this.isENSUrl(url)) {
			this.go(url);
			return;
		} else {
			data.inputValue = url;
			const urlObj = new URL(url);
			data.hostname = this.formatHostname(urlObj.hostname);
		}
		this.setState(data);
	};

	formatHostname(hostname) {
		return hostname.toLowerCase().replace('www.', '');
	}

	onURLChange = inputValue => {
		this.setState({ inputValue });
	};

	sendStateUpdate = () => {
		this.backgroundBridge.sendStateUpdate();
	};

	onLoadProgress = progress => {
		this.setState({ progress });
	};

	onLoadEnd = () => {
		// We need to get the title of the page first
		const { current } = this.webview;
		const js = `
			(function () {
				window.postMessage(
					JSON.stringify({
						type: 'GET_TITLE_FOR_BOOKMARK',
						title: document.title
					})
				)
			})();
		`;
		Platform.OS === 'ios' ? current.evaluateJavaScript(js) : current.injectJavaScript(js);
		clearTimeout(this.timeoutHandler);
	};

	renderLoader() {
		return (
			<View style={styles.loader}>
				<ActivityIndicator size="small" />
			</View>
		);
	}

	renderOptions() {
		const showOptions = (this.props.navigation && this.props.navigation.getParam('showOptions', false)) || false;
		if (showOptions) {
			return (
				<TouchableWithoutFeedback onPress={this.toggleOptions}>
					<View style={styles.optionsOverlay}>
						<View
							style={[
								styles.optionsWrapper,
								Platform.OS === 'android' ? styles.optionsWrapperAndroid : styles.optionsWrapperIos
							]}
						>
							{Platform.OS === 'android' && this.state.canGoBack ? (
								<Button onPress={this.goBack} style={styles.option}>
									<Icon name="arrow-left" size={15} style={styles.optionIcon} />
									<Text style={styles.optionText}>{strings('browser.goBack')}</Text>
								</Button>
							) : null}
							{Platform.OS === 'android' && this.state.canGoForward ? (
								<Button onPress={this.goForward} style={styles.option}>
									<Icon name="arrow-right" size={15} style={styles.optionIcon} />
									<Text style={styles.optionText}>{strings('browser.goForward')}</Text>
								</Button>
							) : null}
							<Button onPress={this.reload} style={styles.option}>
								<Icon name="refresh" size={15} style={styles.optionIcon} />
								<Text style={styles.optionText}>{strings('browser.reload')}</Text>
							</Button>
							<Button onPress={this.bookmark} style={styles.option}>
								<Icon name="star" size={15} style={styles.optionIcon} />
								<Text style={styles.optionText}>{strings('browser.bookmark')}</Text>
							</Button>
							<Button onPress={this.share} style={styles.option}>
								<Icon name="share" size={15} style={styles.optionIcon} />
								<Text style={styles.optionText}>{strings('browser.share')}</Text>
							</Button>
							{Platform.OS === 'android' ? (
								<Button onPress={this.close} style={styles.option}>
									<Icon name="close" size={15} style={styles.optionIcon} />
									<Text style={styles.optionText}>{strings('browser.close')}</Text>
								</Button>
							) : null}
						</View>
					</View>
				</TouchableWithoutFeedback>
			);
		}
	}

	handleScroll = e => {
		if (this.state.progress < 1) {
			return;
		}

		const newOffset = e.contentOffset.y;
		// Avoid wrong position at the beginning
		if (this.prevScrollOffset === 0 && newOffset > SCROLL_THRESHOLD) {
			return;
		}

		// In case they scroll past the top
		if (newOffset <= 0) {
			this.scrollY.setValue(0);
			return;
		}

		const diff = Math.abs(newOffset - this.prevScrollOffset);
		let newAnimatedValue = Math.max(0, Math.min(SCROLL_THRESHOLD, diff) / SCROLL_THRESHOLD);
		if (newOffset < this.prevScrollOffset) {
			// moving down
			newAnimatedValue = 1 - newAnimatedValue;
		}
		this.scrollY.setValue(newAnimatedValue);
	};

	onScrollEnd = e => {
		this.prevScrollOffset = e.contentOffset.y;
	};

	onScrollBeginDrag = e => {
		setTimeout(() => {
			this.prevScrollOffset = e.contentOffset.y;
		}, 150);
	};

	renderBottomBar(canGoForward) {
		const bottom = Platform.OS === 'ios' ? 0 : 10;
		const distance = Platform.OS === 'ios' ? 100 : 200;
		const bottomBarPosition = Animated.diffClamp(this.scrollY, 0, SCROLL_THRESHOLD).interpolate({
			inputRange: [0, 1],
			outputRange: [bottom, bottom - distance]
		});
		return (
			<Animated.View style={[styles.bottomBar, { marginBottom: bottomBarPosition }]}>
				<View style={styles.iconsLeft}>
					<Icon name="angle-left" onPress={this.goBack} size={30} style={styles.icon} />
					<Icon
						disabled={!canGoForward}
						name="angle-right"
						onPress={this.goForward}
						size={30}
						style={{ ...styles.icon, ...(!canGoForward ? styles.disabledIcon : {}) }}
					/>
				</View>
				<View style={styles.iconsRight}>
					<MaterialIcon
						name="more-vert"
						onPress={this.toggleOptions}
						size={20}
						style={[styles.icon, styles.iconMore]}
					/>
				</View>
			</Animated.View>
		);
	}

	isHttps() {
		return this.state.inputValue.toLowerCase().substr(0, 6) === 'https:';
	}

	hideUrlModal = url => {
		const urlParam = typeof url === 'string' ? url : this.props.navigation.state.params.url;
		this.props.navigation.setParams({ url: urlParam, showUrlModal: false });
	};

	clearInputText = () => {
		const { current } = this.inputRef;
		current.clear();
	};

	renderUrlModal() {
		const showUrlModal = (this.props.navigation && this.props.navigation.getParam('showUrlModal', false)) || false;

		if (showUrlModal && this.inputRef) {
			setTimeout(() => {
				const { current } = this.inputRef;
				if (current && !current.isFocused()) {
					current.focus();
				}
			}, 300);
		}

		return (
			<Modal
				isVisible={showUrlModal}
				style={styles.urlModal}
				onBackdropPress={this.hideUrlModal}
				animationIn="slideInDown"
				animationOut="slideOutUp"
				backdropOpacity={0.7}
				animationInTiming={600}
				animationOutTiming={600}
			>
				<View style={styles.urlModalContent}>
					<TextInput
						ref={this.inputRef}
						autoCapitalize="none"
						autoCorrect={false}
						clearButtonMode="while-editing"
						keyboardType="url"
						textContentType={'URL'}
						onChangeText={this.onURLChange}
						onSubmitEditing={this.onUrlInputSubmit}
						placeholder="Enter website address"
						placeholderTextColor={colors.asphalt}
						returnKeyType="go"
						style={styles.urlInput}
						value={this.state.inputValue}
						selectTextOnFocus
					/>

					{Platform.OS === 'android' ? (
						<TouchableOpacity onPress={this.clearInputText} style={styles.iconCloseButton}>
							<MaterialIcon name="close" size={20} style={[styles.icon, styles.iconClose]} />
						</TouchableOpacity>
					) : (
						<TouchableOpacity style={styles.cancelButton} onPress={this.hideUrlModal}>
							<Text style={styles.cancelButtonText}>{strings('browser.cancel')}</Text>
						</TouchableOpacity>
					)}
				</View>
			</Modal>
		);
	}

	getUserAgent() {
		if (Platform.OS === 'android') {
			return 'Mozilla/5.0 (Linux; Android 8.1.0; Android SDK built for x86 Build/OSM1.180201.023) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.98 Mobile Safari/537.36';
		}
		return null;
	}

	render() {
		const { canGoForward, entryScriptWeb3, url } = this.state;

		return (
			<SafeAreaView style={styles.wrapper}>
				<View style={styles.progressBarWrapper}>
					<WebviewProgressBar progress={this.state.progress} />
				</View>
				{entryScriptWeb3 && !this.state.loading ? (
					<Web3Webview
						injectedOnStartLoadingJavaScript={entryScriptWeb3}
						injectedJavaScriptForMainFrameOnly
						onProgress={this.onLoadProgress}
						onLoadEnd={this.onLoadEnd}
						onMessage={this.onMessage}
						onNavigationStateChange={this.onPageChange}
						ref={this.webview}
						source={{ uri: url }}
						style={styles.webview}
						scrollEventThrottle={16}
						onScroll={this.handleScroll}
						onScrollBeginDrag={this.onScrollBeginDrag}
						onScrollEndDrag={this.onScrollEnd}
						onMomentumScrollEnd={this.onScrollEnd}
						userAgent={this.getUserAgent()}
						javascriptEnabled
					/>
				) : (
					this.renderLoader()
				)}
				{this.renderUrlModal()}
				{this.renderOptions()}
				{Platform.OS === 'ios' ? this.renderBottomBar(canGoForward) : null}
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	networkType: state.backgroundState.NetworkController.provider.type,
	selectedAddress: state.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(Browser);
