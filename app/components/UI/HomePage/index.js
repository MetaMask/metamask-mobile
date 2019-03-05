import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {
	Keyboard,
	TouchableWithoutFeedback,
	Image,
	TouchableOpacity,
	Text,
	Platform,
	StyleSheet,
	TextInput,
	View
} from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import ElevatedView from 'react-native-elevated-view';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DeviceSize from '../../../util/DeviceSize';
import { withNavigation } from 'react-navigation';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import BrowserFeatured from '../BrowserFeatured';
import BrowserFavorites from '../BrowserFavorites';
import UrlAutocomplete from '../UrlAutocomplete';
import onUrlSubmit from '../../../util/browser';

const foxImage = require('../../../images/fox.png'); // eslint-disable-line import/no-commonjs

const styles = StyleSheet.create({
	flex: {
		flex: 1
	},
	homePageContent: {
		paddingHorizontal: 18,
		marginBottom: 43
	},
	foxWrapper: {
		height: 20
	},
	topBarWrapper: {
		flexDirection: 'row'
	},
	titleWrapper: {
		flex: 1,
		flexDirection: 'row',
		marginLeft: 8,
		marginTop: 2
	},
	image: {
		width: 22,
		height: 22
	},
	startPageContent: {
		alignItems: 'flex-start'
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
	title: {
		fontSize: 12,
		top: 1,
		...fontStyles.light
	},
	separator: {
		fontSize: 16,
		top: -2,
		...fontStyles.normal
	},
	startPageSubtitle: {
		fontSize: Platform.OS === 'android' ? 14 : 16,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	searchWrapper: {
		flexDirection: 'row',
		marginVertical: Platform.OS === 'ios' ? 20 : 10
	},
	searchInput: {
		marginHorizontal: 10,
		backgroundColor: colors.white,
		fontSize: 14,
		flex: 1,
		...fontStyles.normal
	},
	searchIcon: {
		textAlignVertical: 'center'
	},
	backupAlert: {
		position: 'absolute',
		bottom: DeviceSize.isIphoneX() ? 50 : 20,
		left: 16,
		right: 16
	},
	backupAlertWrapper: {
		padding: 9,
		flexDirection: 'row',
		backgroundColor: colors.lightWarning,
		borderWidth: 1,
		borderColor: colors.yellowBorder,
		borderRadius: 8
	},
	backupAlertIconWrapper: {
		marginRight: 13
	},
	backupAlertIcon: {
		fontSize: 22,
		color: colors.warningText
	},
	backupAlertTitle: {
		fontSize: 12,
		lineHeight: 17,
		color: colors.warningText,
		...fontStyles.bold
	},
	backupAlertMessage: {
		fontSize: 10,
		lineHeight: 14,
		color: colors.warningText,
		...fontStyles.normal
	},
	tabUnderlineStyle: {
		height: 2,
		backgroundColor: colors.primary
	},
	tabStyle: {
		paddingHorizontal: 0,
		backgroundColor: colors.beige
	},
	textStyle: {
		fontSize: 12,
		letterSpacing: 0.5,
		...fontStyles.bold
	},
	metamaskName: {
		width: 90,
		height: 16
	},
	urlAutocomplete: {
		position: 'absolute',
		marginTop: 60,
		backgroundColor: colors.white,
		width: '100%',
		height: '100%'
	}
});

const metamask_name = require('../../../images/metamask-name.png'); // eslint-disable-line

/**
 * Main view component for the Lock screen
 */
class HomePage extends Component {
	static propTypes = {
		/**
		 * react-navigation object used to switch between screens
		 */
		navigation: PropTypes.object,
		/**
		 * Function to be called when tapping on a bookmark item
		 */
		goTo: PropTypes.any,
		/**
		 * function to be called when submitting the text input field
		 */
		onInitialUrlSubmit: PropTypes.any,
		/**
		 * redux flag that indicates if the user set a password
		 */
		passwordSet: PropTypes.bool,
		/**
		 * redux flag that indicates if the user
		 * completed the seed phrase backup flow
		 */
		seedphraseBackedUp: PropTypes.bool
	};

	state = {
		searchInputValue: '',
		inputValue: ''
	};

	actionSheet = null;

	bookmarkIndexToRemove = null;

	componentDidMount() {
		if (Platform.OS === 'android') {
			this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.keyboardDidHide);
		}
	}

	componentWillUnmount() {
		Platform.OS === 'android' && this.keyboardDidHideListener.remove();
	}

	onInitialUrlChange = searchInputValue => {
		this.setState({ searchInputValue });
	};

	onInitialUrlSubmit = () => {
		this.props.onInitialUrlSubmit(this.state.searchInputValue);
		this.setState({ searchInputValue: '' });
	};

	backupAlertPress = () => {
		this.props.navigation.navigate('AccountBackupStep1');
	};

	renderTabBar() {
		return (
			<DefaultTabBar
				underlineStyle={styles.tabUnderlineStyle}
				activeTextColor={colors.primary}
				inactiveTextColor={colors.fontTertiary}
				backgroundColor={colors.white}
				tabStyle={styles.tabStyle}
				textStyle={styles.textStyle}
			/>
		);
	}
	onUrlInputSubmit = async (input = null) => {
		const inputValue = (typeof input === 'string' && input) || this.state.inputValue;
		const { defaultProtocol, searchEngine } = this.props;
		const sanitizedInput = onUrlSubmit(inputValue, searchEngine, defaultProtocol);
		if (sanitizedInput) {
			await this.props.goTo(sanitizedInput);
		} else {
			this.onInitialUrlSubmit(input);
		}
		this.setState({ inputValue: '' });
	};

	onAutocomplete = link => {
		this.setState({ inputValue: link, searchInputValue: '' }, () => {
			this.onUrlInputSubmit(link);
		});
	};

	dismissKeyboardAndClear = () => {
		this.setState({ searchInputValue: '' });
		Keyboard.dismiss();
	};

	keyboardDidHide = () => {
		this.setState({ searchInputValue: '' });
	};

	render() {
		return (
			<TouchableWithoutFeedback style={styles.flex} onPress={this.dismissKeyboardAndClear} accesible={false}>
				<View style={styles.flex}>
					<View style={styles.homePageContent}>
						<View style={styles.searchWrapper}>
							<Icon name="search" size={18} color={colors.asphalt} style={styles.searchIcon} />
							<TextInput
								style={styles.searchInput}
								autoCapitalize="none"
								autoCorrect={false}
								clearButtonMode="while-editing"
								onChangeText={this.onInitialUrlChange}
								onSubmitEditing={this.onInitialUrlSubmit}
								placeholder={strings('browser.search')}
								placeholderTextColor={colors.asphalt}
								returnKeyType="go"
								value={this.state.searchInputValue}
							/>
						</View>
						<View style={styles.topBarWrapper}>
							<View style={styles.foxWrapper}>
								<Image source={foxImage} style={styles.image} resizeMethod={'auto'} />
							</View>
							<View style={styles.titleWrapper}>
								<Image source={metamask_name} style={styles.metamaskName} resizeMethod={'auto'} />

								<Text style={styles.separator}> | </Text>
								<Text style={styles.title}>{strings('browser.dapp_browser')}</Text>
							</View>
						</View>

						<View style={styles.startPageContent}>
							<Text style={styles.startPageTitle}>{strings('browser.welcome')}</Text>
							<Text style={styles.startPageSubtitle}>{strings('browser.dapp_browser_message')}</Text>
						</View>
					</View>

					<ScrollableTabView ref={this.scrollableTabViewRef} renderTabBar={this.renderTabBar}>
						<BrowserFeatured tabLabel={strings('browser.featured_dapps')} goTo={this.props.goTo} />
						<BrowserFavorites tabLabel={strings('browser.my_favorites')} goTo={this.props.goTo} />
					</ScrollableTabView>

					{this.props.passwordSet &&
						!this.props.seedphraseBackedUp && (
							<TouchableOpacity style={styles.backupAlert} onPress={this.backupAlertPress}>
								<ElevatedView elevation={4} style={styles.backupAlertWrapper}>
									<View style={styles.backupAlertIconWrapper}>
										<Icon name="info-outline" style={styles.backupAlertIcon} />
									</View>
									<View>
										<Text style={styles.backupAlertTitle}>
											{strings('home_page.backup_alert_title')}
										</Text>
										<Text style={styles.backupAlertMessage}>
											{strings('home_page.backup_alert_message')}
										</Text>
									</View>
								</ElevatedView>
							</TouchableOpacity>
						)}
					{this.state.searchInputValue.length > 1 && (
						<View style={styles.urlAutocomplete}>
							<UrlAutocomplete onSubmit={this.onAutocomplete} input={this.state.searchInputValue} />
						</View>
					)}
				</View>
			</TouchableWithoutFeedback>
		);
	}
}

const mapStateToProps = state => ({
	seedphraseBackedUp: state.user.seedphraseBackedUp,
	passwordSet: state.user.passwordSet
});

export default connect(mapStateToProps)(withNavigation(HomePage));
