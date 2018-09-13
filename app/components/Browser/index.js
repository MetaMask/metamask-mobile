import React, { Component } from 'react';
import BackgroundBridge from '../../core/BackgroundBridge';
import Web3Webview from 'react-native-web3-webview';
import Engine from '../../core/Engine';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import RNFS from 'react-native-fs';
import getNavbarOptions from '../Navbar';
import WebviewProgressBar from '../WebviewProgressBar';
import {
	ScrollView,
	TouchableOpacity,
	Image,
	Text,
	ActivityIndicator,
	Platform,
	StyleSheet,
	TextInput,
	View,
	TouchableWithoutFeedback,
	AsyncStorage,
	Alert
} from 'react-native';
import { colors, baseStyles, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import Networks from '../../util/networks';
import Logger from '../../util/Logger';
import Button from '../Button';
import AnimatedFox from '../AnimatedFox';
import Share from 'react-native-share'; // eslint-disable-line  import/default
import { strings } from '../../../locales/i18n';

const styles = StyleSheet.create({
	wrapper: {
		...baseStyles.flexGrow,
		backgroundColor: colors.concrete
	},
	urlBar: {
		alignItems: 'stretch',
		backgroundColor: colors.concrete,
		flexDirection: 'row',
		paddingVertical: 11
	},
	icon: {
		color: colors.tar,
		flex: 0,
		height: 28,
		lineHeight: 28,
		textAlign: 'center',
		width: 36,
		alignSelf: 'center'
	},
	disabledIcon: {
		color: colors.ash
	},
	urlInput: {
		...fontStyles.normal,
		backgroundColor: colors.slate,
		borderRadius: 3,
		flex: 1,
		fontSize: 14,
		padding: 8
	},
	progressBarWrapper: {
		height: 3,
		marginTop: -5
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
		shadowColor: colors.gray,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.5,
		shadowRadius: 3,
		position: 'absolute',
		zIndex: 99999999,
		marginTop: 50,
		right: 3,
		width: 140,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor,
		backgroundColor: colors.concrete
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
	startPageWrapper: {
		...baseStyles.flexGrow,
		backgroundColor: colors.white
	},
	startPageWrapperContent: {
		backgroundColor: colors.white,
		padding: 30,
		paddingBottom: 0
	},
	foxWrapper: {
		marginTop: 10,
		marginBottom: 0,
		height: 150
	},
	startPageContent: {
		flex: 1,
		alignItems: 'center'
	},
	startPageTitle: {
		fontSize: Platform.OS === 'android' ? 30 : 35,
		marginTop: 20,
		marginBottom: 20,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold
	},
	startPageSubtitle: {
		fontSize: Platform.OS === 'android' ? 18 : 20,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	bookmarksWrapper: {
		alignSelf: 'flex-start',
		flex: 1
	},

	bookmarksTitle: {
		fontSize: Platform.OS === 'android' ? 15 : 20,
		marginTop: 20,
		marginBottom: 10,
		color: colors.fontPrimary,
		justifyContent: 'center',
		...fontStyles.bold
	},

	bookmarkItem: {
		marginBottom: 15,
		paddingVertical: 5
	},
	bookmarkTouchable: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	bookmarkUrl: {
		paddingRight: 35,
		...fontStyles.normal
	},
	bookmarkIco: {
		width: 24,
		height: 24,
		marginRight: 7
	},
	bookmarkIconDefault: {
		position: 'absolute',
		marginTop: 0,
		marginLeft: 5,
		width: 24,
		height: 24,
		marginRight: 10,
		color: colors.fontSecondary
	},
	searchInput: {
		marginVertical: 20,
		backgroundColor: colors.white,
		padding: 15,
		width: '100%',
		borderColor: colors.borderColor,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 3,
		fontSize: 17,
		...fontStyles.normal
	},
	noBookmarks: {
		color: colors.fontSecondary,
		...fontStyles.normal
	}
});

/**
 * Complete Web browser component with URL entry and history management
 */
export class Browser extends Component {
	static navigationOptions = ({ navigation }) => getNavbarOptions('Browser', navigation);

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
		navigation: PropTypes.object
	};

	state = {
		approvedOrigin: false,
		canGoBack: false,
		canGoForward: false,
		entryScriptWeb3: null,
		inputValue: '',
		url: '',
		showOptions: false,
		currentPageTitle: '',
		searchInputValue: ''
	};

	webview = React.createRef();

	bookmarks = [];

	loadBookmarks = async () => {
		const bookmarksStr = await AsyncStorage.getItem('@MetaMask:bookmarks');
		if (bookmarksStr) {
			return JSON.parse(bookmarksStr).reverse();
		}
		return [];
	};

	async componentDidMount() {
		this.bookmarks = await this.loadBookmarks();
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
	}

	go = url => {
		const hasProtocol = url.match(/^[a-z]*:\/\//);
		const sanitizedURL = hasProtocol ? url : `${this.props.defaultProtocol}${url}`;
		this.setState({ url: sanitizedURL, progress: 0 });
	};

	onUrlInputSubmit = () => {
		this.go(this.state.inputValue);
	};

	goBack = () => {
		if (this.state.canGoBack) {
			const { current } = this.webview;
			current && current.goBack();
		} else {
			this.setState({ inputValue: '', url: '' });
		}
	};

	goForward = () => {
		const { current } = this.webview;
		current && current.goForward();
	};

	reload = () => {
		const { current } = this.webview;
		current && current.reload();
	};

	bookmark = () => {
		this.toggleOptions();
		// Check it doesn't exist already
		if (this.bookmarks.filter(i => i.url === this.state.inputValue).length) {
			Alert.alert(strings('browser.error'), strings('browser.bookmarkAlreadyExists'));
			return false;
		}

		this.props.navigation.push('AddBookmark', {
			title: this.state.currentPageTitle || '',
			url: this.state.inputValue,
			onAddBookmark: async ({ name, url }) => {
				this.bookmarks.push({ name, url });
				await AsyncStorage.setItem('@MetaMask:bookmarks', JSON.stringify(this.bookmarks));
			}
		});
	};

	share = () => {
		Share.open({
			url: this.state.url
		}).catch(err => {
			Logger.log('Error while trying to share address', err);
		});
	};

	toggleOptions = () => {
		this.setState({ showOptions: !this.state.showOptions });
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
			}
		} catch (e) {
			Logger.error(`Browser::onMessage on ${this.state.inputValue}`, e.toString());
		}
	};

	onPageChange = ({ canGoBack, canGoForward, url }) => {
		this.setState({ canGoBack, canGoForward, inputValue: url });
	};

	onInitialUrlChange = searchInputValue => {
		this.setState({ searchInputValue });
	};

	onInitialUrlSubmit = () => {
		if (this.state.searchInputValue === '') {
			return false;
		}
		const str = this.state.searchInputValue;
		const res = str.match(
			/^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/g
		);
		if (res === null) {
			this.go('https://www.google.com/search?q=' + escape(str));
		} else {
			this.go(str);
		}
	};

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
		Platform.OS === 'ios' ? current.evaluateJavaScript(js) : current.injectJavascript(js);
	};

	renderLoader() {
		return (
			<View style={styles.loader}>
				<ActivityIndicator size="small" />
			</View>
		);
	}

	renderOptions() {
		if (this.state.showOptions) {
			return (
				<TouchableWithoutFeedback onPress={this.toggleOptions}>
					<View style={styles.optionsOverlay}>
						<View style={styles.optionsWrapper}>
							<Button onPress={this.reload} style={styles.option}>
								<Icon name="refresh" size={15} style={styles.optionIcon} />
								<Text style={styles.optionText}>Reload</Text>
							</Button>
							<Button onPress={this.bookmark} style={styles.option}>
								<Icon name="star" size={15} style={styles.optionIcon} />
								<Text style={styles.optionText}>Bookmark</Text>
							</Button>
							<Button onPress={this.share} style={styles.option}>
								<Icon name="share" size={15} style={styles.optionIcon} />
								<Text style={styles.optionText}>Share</Text>
							</Button>
						</View>
					</View>
				</TouchableWithoutFeedback>
			);
		}
	}
	getHost(url) {
		const tmp = url.split('/');
		return tmp[2];
	}

	renderBookmarks() {
		let content = null;
		if (this.bookmarks.length) {
			content = this.bookmarks.map(i => {
				const iconUrl = `http://icons.duckduckgo.com/ip2/${this.getHost(i.url)}.ico`;
				return (
					<View key={i.url} style={styles.bookmarkItem}>
						<TouchableOpacity
							style={styles.bookmarkTouchable}
							onPress={() => this.go(i.url)} // eslint-disable-line react/jsx-no-bind
						>
							<Icon name="bookmark" size={20} style={styles.bookmarkIconDefault} />
							<Image style={styles.bookmarkIco} source={{ uri: iconUrl }} />
							<Text numberOfLines={1} style={styles.bookmarkUrl}>
								{i.name}
							</Text>
						</TouchableOpacity>
					</View>
				);
			});
		} else {
			content = <Text style={styles.noBookmarks}>{strings('browser.noBookmarks')}</Text>;
		}
		return (
			<View style={styles.bookmarksWrapper}>
				<Text style={styles.bookmarksTitle}>{strings('browser.bookmarks')}</Text>
				<View style={styles.bookmarksItemsWrapper}>{content}</View>
			</View>
		);
	}

	renderStartPage() {
		return (
			<ScrollView style={styles.startPageWrapper} contentContainerStyle={styles.startPageWrapperContent}>
				<View style={styles.foxWrapper}>
					<AnimatedFox />
				</View>
				<View style={styles.startPageContent}>
					<Text style={styles.startPageTitle}>{strings('browser.letsGetStarted')}</Text>
					<Text style={styles.startPageSubtitle}>{strings('browser.web3Awaits')}</Text>
					<TextInput
						style={styles.searchInput}
						autoCapitalize="none"
						autoCorrect={false}
						clearButtonMode="while-editing"
						keyboardType="url"
						textContentType={'URL'}
						onChangeText={this.onInitialUrlChange}
						onSubmitEditing={this.onInitialUrlSubmit}
						placeholder="Search or type URL"
						placeholderTextColor={colors.asphalt}
						returnKeyType="go"
						value={this.state.searchInputValue}
					/>
					{this.renderBookmarks()}
				</View>
			</ScrollView>
		);
	}

	render() {
		const { canGoForward, entryScriptWeb3, inputValue, url } = this.state;

		if (this.state.url === '') {
			return this.renderStartPage();
		}

		return (
			<View style={styles.wrapper}>
				<View style={styles.urlBar}>
					<Icon name="angle-left" onPress={this.goBack} size={30} style={styles.icon} />
					{canGoForward ? (
						<Icon
							disabled={!canGoForward}
							name="angle-right"
							onPress={this.goForward}
							size={30}
							style={{ ...styles.icon, ...(!canGoForward ? styles.disabledIcon : {}) }}
						/>
					) : null}
					<TextInput
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
						value={inputValue}
					/>
					<MaterialIcon name="more-vert" onPress={this.toggleOptions} size={20} style={styles.icon} />
				</View>
				<View style={styles.progressBarWrapper}>
					<WebviewProgressBar progress={this.state.progress} />
				</View>
				{this.renderOptions()}
				{entryScriptWeb3 ? (
					<Web3Webview
						injectedOnStartLoadingJavaScript={entryScriptWeb3}
						injectedJavaScriptForMainFrameOnly
						onProgress={this.onLoadProgress}
						onLoadEnd={this.onLoadEnd}
						onMessage={this.onMessage}
						onNavigationStateChange={this.onPageChange}
						ref={this.webview}
						source={{ uri: url }}
						style={baseStyles.flexGrow}
					/>
				) : (
					this.renderLoader()
				)}
			</View>
		);
	}
}

const mapStateToProps = state => ({
	networkType: state.backgroundState.NetworkController.provider.type,
	selectedAddress: state.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(Browser);
