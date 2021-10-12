import React, { PureComponent } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Text, Dimensions } from 'react-native';
import PropTypes from 'prop-types';
import ElevatedView from 'react-native-elevated-view';
import WebsiteIcon from '../../WebsiteIcon';
import { strings } from '../../../../../locales/i18n';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { colors, fontStyles } from '../../../../styles/common';
import Device from '../../../../util/device';
import AppConstants from '../../../../core/AppConstants';
import { getHost } from '../../../../util/browser';

const margin = 15;
const width = Dimensions.get('window').width - margin * 2;
const height = Dimensions.get('window').height / (Device.isIphone5S() ? 4 : 5);
let paddingTop = Dimensions.get('window').height - 190;
if (Device.isIphoneX()) {
	paddingTop -= 65;
}

if (Device.isAndroid()) {
	paddingTop -= 10;
}

const styles = StyleSheet.create({
	tabFavicon: {
		alignSelf: 'flex-start',
		width: 22,
		height: 22,
		marginRight: 5,
		marginLeft: 2,
		marginTop: 1,
	},
	tabSiteName: {
		color: colors.white,
		...fontStyles.bold,
		fontSize: 18,
		marginRight: 40,
		marginLeft: 5,
		marginTop: 0,
	},
	tabHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'flex-start',
		backgroundColor: colors.grey500,
		paddingVertical: 10,
		paddingHorizontal: 10,
	},
	tabWrapper: {
		marginBottom: 15,
		borderRadius: 10,
		elevation: 8,
		justifyContent: 'space-evenly',
		overflow: 'hidden',
		borderColor: colors.grey100,
		borderWidth: 1,
		width,
		height,
	},
	checkWrapper: {
		backgroundColor: colors.transparent,
		overflow: 'hidden',
	},
	tab: {
		backgroundColor: colors.white,
		flex: 1,
		alignItems: 'flex-start',
		justifyContent: 'flex-start',
	},
	tabImage: {
		...StyleSheet.absoluteFillObject,
		paddingTop,
		width: null,
		height: null,
		resizeMode: 'cover',
	},
	activeTab: {
		borderWidth: 5,
		borderColor: colors.blue,
	},
	closeTabIcon: {
		paddingHorizontal: 10,
		paddingTop: 3,
		fontSize: 32,
		color: colors.white,
		right: 0,
		marginTop: -7,
		position: 'absolute',
	},
	titleButton: {
		backgroundColor: colors.transparent,
		flex: 1,
		flexDirection: 'row',
		marginRight: 40,
	},
	closeTabButton: {
		backgroundColor: colors.transparent,
		width: Device.isIos() ? 30 : 35,
		height: 24,
		marginRight: -5,
	},
});

const { HOMEPAGE_URL } = AppConstants;
const METAMASK_FOX = require('../../../../images/fox.png'); // eslint-disable-line import/no-commonjs

/**
 * PureComponent that renders an a thumbnail
 * that represents an existing tab
 */
export default class TabThumbnail extends PureComponent {
	static propTypes = {
		/**
		 * The tab info
		 */
		tab: PropTypes.object,
		/**
		 * Flag that determines if this is the active tab
		 */
		isActiveTab: PropTypes.bool,
		/**
		 * Closes a tab
		 */
		onClose: PropTypes.func,
		/**
		 * Switches to a specific tab
		 */
		onSwitch: PropTypes.func,
	};

	getContainer = () => (Device.isAndroid() ? View : ElevatedView);

	render() {
		const { isActiveTab, tab, onClose, onSwitch } = this.props;
		const Container = this.getContainer();
		const hostname = getHost(tab.url);
		const isHomepage = hostname === getHost(HOMEPAGE_URL);

		return (
			<Container style={styles.checkWrapper} elevation={8}>
				<TouchableOpacity
					onPress={() => onSwitch(tab)} // eslint-disable-line react/jsx-no-bind
					style={[styles.tabWrapper, isActiveTab && styles.activeTab]}
				>
					<View style={styles.tabHeader}>
						<View style={styles.titleButton}>
							{!isHomepage ? (
								<WebsiteIcon transparent style={styles.tabFavicon} title={hostname} url={tab.url} />
							) : (
								<Image style={styles.tabFavicon} title={tab.url} source={METAMASK_FOX} />
							)}
							<Text style={styles.tabSiteName} numberOfLines={1}>
								{isHomepage ? strings('browser.new_tab') : hostname}
							</Text>
						</View>
						<TouchableOpacity
							onPress={() => onClose(tab)} // eslint-disable-line react/jsx-no-bind
							style={styles.closeTabButton}
						>
							<IonIcon name="ios-close" style={styles.closeTabIcon} />
						</TouchableOpacity>
					</View>
					<View style={styles.tab}>
						<Image source={{ uri: tab.image }} style={styles.tabImage} />
					</View>
				</TouchableOpacity>
			</Container>
		);
	}
}
