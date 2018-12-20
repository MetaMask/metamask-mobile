import React, { Component } from 'react';
import Icon from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';
import ActionSheet from 'react-native-actionsheet';
import { connect } from 'react-redux';
import {
	InteractionManager,
	ScrollView,
	TouchableOpacity,
	Image,
	Text,
	Platform,
	StyleSheet,
	TextInput,
	View
} from 'react-native';
import { colors, baseStyles, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import { removeBookmark } from '../../actions/bookmarks';
import WebsiteIcon from '../WebsiteIcon';

const foxImage = require('../../images/fox.png'); // eslint-disable-line import/no-commonjs

const styles = StyleSheet.create({
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
		height: 120,
		alignItems: 'center'
	},
	image: {
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
	},
	fallbackTextStyle: {
		fontSize: 12
	}
});

/**
 * Main view component for the Lock screen
 */
class HomePage extends Component {
	static propTypes = {
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
		removeBookmark: PropTypes.func
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

	getHost(url) {
		const tmp = url.split('/');
		return tmp[2];
	}

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
						<Icon name="bookmark" size={20} style={styles.bookmarkIconDefault} />
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

	render = () => (
		<ScrollView style={styles.startPageWrapper} contentContainerStyle={styles.startPageWrapperContent}>
			<View style={styles.foxWrapper}>
				<Image source={foxImage} style={styles.image} resizeMethod={'auto'} />
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

const mapStateToProps = state => ({
	bookmarks: state.bookmarks
});

const mapDispatchToProps = dispatch => ({
	removeBookmark: bookmark => dispatch(removeBookmark(bookmark))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(HomePage);
