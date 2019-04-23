import React, { Component } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Text, Dimensions } from 'react-native';
import PropTypes from 'prop-types';
import WebsiteIcon from '../../../../UI/WebsiteIcon';
import { strings } from '../../../../../../locales/i18n';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { colors, fontStyles } from '../../../../../styles/common';

const styles = StyleSheet.create({
	tabFavicon: {
		alignSelf: 'flex-start',
		width: 12,
		height: 12,
		marginRight: 5
	},
	tabSiteName: {
		color: colors.fontPrimary,
		...fontStyles.normal,
		fontSize: 10,
		marginRight: 25
	},
	tabHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'flex-start',
		backgroundColor: colors.grey000,
		paddingVertical: 5,
		paddingHorizontal: 8,
		minHeight: 25
	},
	tabWrapper: {
		marginBottom: 20,
		borderRadius: 10,
		justifyContent: 'space-evenly',
		overflow: 'hidden',
		borderColor: colors.grey100,
		borderWidth: 1,
		height: Dimensions.get('window').width / 2 + 20,
		width: Dimensions.get('window').width / 2 - 30
	},
	tab: {
		backgroundColor: colors.white,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden'
	},
	tabImage: {
		marginTop: 72,
		width: Dimensions.get('window').width / 2 - 40,
		height: Dimensions.get('window').width / 0.2
	},
	activeTab: {
		borderWidth: 3,
		borderColor: colors.blue
	},
	closeTabIcon: {
		top: -1,
		right: 8,
		position: 'absolute'
	}
});

const HOMEPAGE_URL = 'about:blank';
const HOME_SNAPSHOT = require('../../../../../images/home.jpeg'); // eslint-disable-line import/no-commonjs
const METAMASK_FOX = require('../../../../../images/fox.png'); // eslint-disable-line import/no-commonjs

export default class Tab extends Component {
	static propTypes = {
		/**
		 * The tab info
		 */
		tab: PropTypes.object,
		/**
		 * the
		 */
		isActiveTab: PropTypes.bool,
		/**
		 * Closes a tab
		 */
		onClose: PropTypes.func,
		/**
		 * Switches to a specific tab
		 */
		onSwitch: PropTypes.func
	};

	render() {
		const { isActiveTab, tab, onClose, onSwitch } = this.props;
		return (
			<View style={[styles.tabWrapper, isActiveTab && styles.activeTab]}>
				<View style={styles.tabHeader}>
					{tab.url !== HOMEPAGE_URL ? (
						<WebsiteIcon style={styles.tabFavicon} title={tab.url} url={tab.url} />
					) : (
						<Image style={styles.tabFavicon} title={tab.url} source={METAMASK_FOX} />
					)}
					<Text style={styles.tabSiteName} numberOfLines={1}>
						{tab.url === HOMEPAGE_URL ? strings('browser.new_tab') : tab.url}
					</Text>
					<IonIcon
						name="ios-close"
						size={24}
						style={styles.closeTabIcon}
						// eslint-disable-next-line react/jsx-no-bind
						onPress={() => onClose(tab)}
					/>
				</View>
				<TouchableOpacity
					style={styles.tab}
					// eslint-disable-next-line react/jsx-no-bind
					onPress={() => onSwitch(tab)}
				>
					{tab.url !== HOMEPAGE_URL ? (
						<Image resizeMode={'contain'} source={{ uri: tab.image }} style={styles.tabImage} />
					) : (
						<Image resizeMode={'contain'} source={HOME_SNAPSHOT} style={styles.tabImage} />
					)}
				</TouchableOpacity>
			</View>
		);
	}
}
