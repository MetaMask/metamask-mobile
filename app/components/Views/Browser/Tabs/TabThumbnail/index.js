import React, { Component } from 'react';
import { Platform, View, Image, TouchableOpacity, StyleSheet, Text, Dimensions } from 'react-native';
import PropTypes from 'prop-types';
import WebsiteIcon from '../../../../UI/WebsiteIcon';
import { strings } from '../../../../../../locales/i18n';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { colors, fontStyles } from '../../../../../styles/common';

const margin = 16;
const width = Dimensions.get('window').width / 2 - margin * 2;
const offset = v => (Platform.OS === 'android' ? v + 20 : v);

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
		// height: Dimensions.get('window').width / 2 + 20,
		// width: Dimensions.get('window').width / 2 - 30
		width,
		height: width * 1.77
	},
	tab: {
		backgroundColor: colors.white,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden'
	},
	tabImage: {
		...StyleSheet.absoluteFillObject,
		width: null,
		height: null,
		resizeMode: 'cover'
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

export default class TabThumbnail extends Component {
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

	ref = React.createRef();

	measure = async () =>
		new Promise(resolve =>
			this.ref.current.measureInWindow((x, y, width, height) => resolve({ x, y: offset(y), width, height }))
		);

	render() {
		const { isActiveTab, tab, onClose, onSwitch } = this.props;
		const { ref } = this;

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
						<Image source={{ uri: tab.image }} style={styles.tabImage} {...{ ref }} />
					) : (
						<Image source={HOME_SNAPSHOT} style={styles.tabImage} {...{ ref }} />
					)}
				</TouchableOpacity>
			</View>
		);
	}
}
