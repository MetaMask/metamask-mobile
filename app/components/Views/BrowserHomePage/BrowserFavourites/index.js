import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withNavigation } from 'react-navigation';
import PropTypes from 'prop-types';
import { strings } from '../../../../../locales/i18n';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import WebsiteIcon from '../../../UI/WebsiteIcon';
import { colors, fontStyles } from '../../../../styles/common';
import ActionSheet from 'react-native-actionsheet';

const styles = StyleSheet.create({
	bookmarksWrapper: {
		alignSelf: 'flex-start',
		flex: 1
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
	noBookmarks: {
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	fallbackTextStyle: {
		fontSize: 12
	},
	wrapper: {
		padding: 18
	}
});

/**
 * Favourites
 */
class BrowserFavourites extends Component {
	static propTypes = {
		/**
		 * Array containing all the bookmark items
		 */
		bookmarks: PropTypes.array,
		/**
		 * Function to be called when tapping on a bookmark item
		 */
		onBookmarkTapped: PropTypes.any
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
		return <View style={styles.wrapper}>{this.renderBookmarks()}</View>;
	}
}

const mapStateToProps = state => ({
	bookmarks: state.bookmarks
});

export default connect(mapStateToProps)(withNavigation(BrowserFavourites));
