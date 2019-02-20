import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {
	Image,
	InteractionManager,
	SafeAreaView,
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
import BrowserFeatured from '../../Views/BrowserHomePage/BrowserFeatured';
import BrowserFavourites from '../../Views/BrowserHomePage/BrowserFavourites';

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
		marginLeft: 8
	},
	image: {
		width: 20,
		height: 20
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
		fontSize: 16,
		...fontStyles.light
	},
	startPageSubtitle: {
		fontSize: Platform.OS === 'android' ? 14 : 16,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	searchWrapper: {
		flexDirection: 'row',
		marginVertical: 20
	},
	searchInput: {
		backgroundColor: colors.white,
		marginHorizontal: 10,
		width: '100%',
		fontSize: 14,
		flex: 1,
		...fontStyles.normal
	},
	backupAlert: {
		position: 'absolute',
		bottom: DeviceSize.isIphoneX() ? 50 : 30,
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
	}
});

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
		searchInputValue: ''
	};

	actionSheet = null;

	bookmarkIndexToRemove = null;

	onInitialUrlChange = searchInputValue => {
		this.setState({ searchInputValue });
	};

	onInitialUrlSubmit = () => {
		this.props.onInitialUrlSubmit(this.state.searchInputValue);
		InteractionManager.runAfterInteractions(() => {
			this.setState({ searchInputValue: '' });
		});
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

	render() {
		return (
			<SafeAreaView style={styles.flex}>
				<View style={styles.homePageContent}>
					<View style={styles.searchWrapper}>
						<Icon name="search" size={18} color={colors.fontPrimary} />
						<TextInput
							style={styles.searchInput}
							autoCapitalize="none"
							autoCorrect={false}
							clearButtonMode="while-editing"
							onChangeText={this.onInitialUrlChange}
							onSubmitEditing={this.onInitialUrlSubmit}
							placeholder={'SEARCH'}
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
							<Text style={styles.title}>Metamask | DAPP BROWSER</Text>
						</View>
					</View>

					<View style={styles.startPageContent}>
						<Text style={styles.startPageTitle}>Welcome!</Text>
						<Text style={styles.startPageSubtitle}>
							MetaMask is your wallet and browser for the decentralized web. Have a look around!
						</Text>
					</View>
				</View>

				<ScrollableTabView ref={this.scrollableTabViewRef} renderTabBar={this.renderTabBar}>
					<BrowserFeatured tabLabel={'FEATURED DAPPS'} goTo={this.props.goTo} />
					<BrowserFavourites tabLabel={'MY FAVORITES'} goTo={this.props.goTo} />
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
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	seedphraseBackedUp: state.user.seedphraseBackedUp,
	passwordSet: state.user.passwordSet
});

export default connect(mapStateToProps)(withNavigation(HomePage));
