import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ActionSheet from 'react-native-actionsheet';
import { connect } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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
import AnimatedFox from 'react-native-animated-fox';
import { colors, baseStyles, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { removeBookmark } from '../../../actions/bookmarks';
import WebsiteIcon from '../WebsiteIcon';
import ElevatedView from 'react-native-elevated-view';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DeviceSize from '../../../util/DeviceSize';
import { withNavigation } from 'react-navigation';
const foxImage = require('../../../images/fox.png'); // eslint-disable-line import/no-commonjs

const styles = StyleSheet.create({
	flex: {
		flex: 1
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
		height: 120
	},
	image: {
		alignSelf: 'center',
		width: 120,
		height: 120
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
		width: 26,
		height: 26,
		marginRight: 7,
		borderRadius: 13
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
	},
	fallbackTextStyle: {
		fontSize: 12
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
		 * Array containing all the bookmark items
		 */
		bookmarks: PropTypes.array,
		/**
		 * Function to be called when tapping on a bookmark item
		 */
		onBookmarkTapped: PropTypes.any,
		/**
		 * function to be called when submitting the text input field
		 */
		onInitialUrlSubmit: PropTypes.any,
		/**
		 * function that removes a bookmark
		 */
		removeBookmark: PropTypes.func,
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

	showRemoveMenu = index => {
		this.bookmarkIndexToRemove = index;
		this.actionSheet.show();
	};

	removeBookmark = () => {
		this.props.removeBookmark(this.props.bookmarks[this.bookmarkIndexToRemove]);
	};

	createActionSheetRef = ref => {
		this.actionSheet = ref;
	};

	backupAlertPress = () => {
		this.props.navigation.navigate('AccountBackupStep1');
	};

	renderBookmarks = () => {
		let content = null;
		if (this.props.bookmarks.length) {
			content = this.props.bookmarks.map((item, i) => (
				<View key={item.url} style={styles.bookmarkItem}>
					<TouchableOpacity
						style={styles.bookmarkTouchable}
						onPress={() => this.props.onBookmarkTapped(item.url)} // eslint-disable-line react/jsx-no-bind
						// eslint-disable-next-line react/jsx-no-bind
						onLongPress={() => this.showRemoveMenu(i)}
					>
						<WebsiteIcon
							style={styles.bookmarkIco}
							url={item.url}
							title={item.name}
							textStyle={styles.fallbackTextStyle}
						/>
						<Text numberOfLines={1} style={styles.bookmarkUrl}>
							{item.name}
						</Text>
					</TouchableOpacity>
				</View>
			));
		} else {
			content = <Text style={styles.noBookmarks}>{strings('home_page.no_bookmarks')}</Text>;
		}
		return (
			<View style={styles.bookmarksWrapper}>
				<Text style={styles.bookmarksTitle}>{strings('home_page.bookmarks')}</Text>
				<View style={styles.bookmarksItemsWrapper}>{content}</View>
				<ActionSheet
					ref={this.createActionSheetRef}
					title={strings('home_page.remove_bookmark_title')}
					options={['Remove', 'cancel']}
					cancelButtonIndex={1}
					destructiveButtonIndex={0}
					// eslint-disable-next-line react/jsx-no-bind
					onPress={index => (index === 0 ? this.removeBookmark() : null)}
				/>
			</View>
		);
	};

	render() {
		return (
			<SafeAreaView style={styles.flex}>
				<KeyboardAwareScrollView
					style={styles.startPageWrapper}
					contentContainerStyle={styles.startPageWrapperContent}
					resetScrollToCoords={{ x: 0, y: 0 }}
				>
					<View style={styles.foxWrapper}>
						{Platform.OS === 'android' ? (
							<Image source={foxImage} style={styles.image} resizeMethod={'auto'} />
						) : (
							<AnimatedFox />
						)}
					</View>
					<View style={styles.startPageContent}>
						<Text style={styles.startPageTitle}>{strings('home_page.lets_get_started')}</Text>
						<Text style={styles.startPageSubtitle}>{strings('home_page.web3_awaits')}</Text>
						<TextInput
							style={styles.searchInput}
							autoCapitalize="none"
							autoCorrect={false}
							clearButtonMode="while-editing"
							onChangeText={this.onInitialUrlChange}
							onSubmitEditing={this.onInitialUrlSubmit}
							placeholder={strings('home_page.search_placeholder')}
							placeholderTextColor={colors.asphalt}
							returnKeyType="go"
							value={this.state.searchInputValue}
						/>
						{this.renderBookmarks()}
					</View>
				</KeyboardAwareScrollView>
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
	bookmarks: state.bookmarks,
	seedphraseBackedUp: state.user.seedphraseBackedUp,
	passwordSet: state.user.passwordSet
});

const mapDispatchToProps = dispatch => ({
	removeBookmark: bookmark => dispatch(removeBookmark(bookmark))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withNavigation(HomePage));
