import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import { Dimensions, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import WebsiteIcon from '../WebsiteIcon';
import { colors, fontStyles } from '../../../styles/common';
import ActionSheet from 'react-native-actionsheet';

const TABBAR_HEIGHT = 50;
const MIN_HEIGHT = Dimensions.get('window').height / 2 + TABBAR_HEIGHT;
const styles = StyleSheet.create({
	wrapper: {
		minHeight: MIN_HEIGHT,
		backgroundColor: colors.white
	},
	bookmarksWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	bookmarkItem: {
		paddingTop: 20,
		paddingHorizontal: 18
	},
	bookmarksItemsWrapper: {
		flex: 1
	},

	bookmarkTouchable: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	bookmarkUrl: {
		flex: 1,
		...fontStyles.normal
	},
	bookmarkIco: {
		width: 26,
		height: 26,
		marginRight: 7,
		borderRadius: 13
	},
	noBookmarks: {
		fontSize: 16,
		color: colors.fontSecondary,
		textAlign: 'center',
		...fontStyles.bold
	},
	fallbackTextStyle: {
		fontSize: 12
	},
	noBookmarksWrapper: {
		marginTop: 120,
		paddingHorizontal: 20
	}
});

/**
 * Browser favorite sites
 */
export default class BrowserFavorites extends PureComponent {
	static propTypes = {
		/**
		 * Array containing all the bookmark items
		 */
		bookmarks: PropTypes.array,
		/**
		 * Function to be called when tapping on a bookmark item
		 */
		goTo: PropTypes.any,
		/**
		 * function that removes a bookmark
		 */
		removeBookmark: PropTypes.func
	};

	actionSheet = null;
	self = React.createRef();

	keyExtractor = item => item.url;

	bookmarkUrlToRemove = null;

	showRemoveMenu = url => {
		this.bookmarkUrlToRemove = url;
		this.actionSheet.show();
	};

	removeBookmark = () => {
		const bookmark = this.props.bookmarks.find(bookmark => bookmark.url === this.bookmarkUrlToRemove);
		this.props.removeBookmark(bookmark);
	};

	createActionSheetRef = ref => {
		this.actionSheet = ref;
	};

	renderItem = item => {
		const { url, name } = item;
		return (
			<View key={item.url} style={styles.bookmarkItem}>
				<TouchableOpacity
					style={styles.bookmarkTouchable}
					onPress={() => this.props.goTo(url)} // eslint-disable-line react/jsx-no-bind
					// eslint-disable-next-line react/jsx-no-bind
					onLongPress={() => this.showRemoveMenu(url)}
				>
					<WebsiteIcon
						style={styles.bookmarkIco}
						url={url}
						title={name}
						textStyle={styles.fallbackTextStyle}
					/>
					<Text numberOfLines={1} style={styles.bookmarkUrl}>
						{name}
					</Text>
				</TouchableOpacity>
			</View>
		);
	};

	measureMyself(cb) {
		this.self && this.self.current && this.self.current.measure(cb);
	}

	renderBookmarks() {
		const { bookmarks } = this.props;
		let content = null;
		if (bookmarks && bookmarks.length) {
			content = bookmarks.map(item => this.renderItem(item));
		} else {
			content = (
				<View style={styles.noBookmarksWrapper}>
					<Text style={styles.noBookmarks}>{strings('home_page.no_bookmarks')}</Text>
				</View>
			);
		}
		return (
			<View style={styles.bookmarksWrapper}>
				<View style={styles.bookmarksItemsWrapper}>{content}</View>
				<ActionSheet
					ref={this.createActionSheetRef}
					title={strings('home_page.remove_bookmark_title')}
					options={[strings('browser.remove'), strings('browser.cancel')]}
					cancelButtonIndex={1}
					destructiveButtonIndex={0}
					// eslint-disable-next-line react/jsx-no-bind
					onPress={index => (index === 0 ? this.removeBookmark() : null)}
				/>
			</View>
		);
	}

	render() {
		const allItemsHeight = (this.props.bookmarks && this.props.bookmarks.length * 40) || MIN_HEIGHT;
		return (
			<View ref={this.self} style={[styles.wrapper, { height: Math.max(MIN_HEIGHT, allItemsHeight) }]}>
				{this.renderBookmarks()}
			</View>
		);
	}
}
