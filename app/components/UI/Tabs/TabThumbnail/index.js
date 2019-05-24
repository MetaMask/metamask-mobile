import React, { Component } from 'react';
import { Platform, View, Image, TouchableOpacity, StyleSheet, Text, Dimensions } from 'react-native';
import PropTypes from 'prop-types';
import ElevatedView from 'react-native-elevated-view';
import WebsiteIcon from '../../WebsiteIcon';
import { strings } from '../../../../../locales/i18n';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { colors, fontStyles } from '../../../../styles/common';
import URL from 'url-parse';
import DeviceSize from '../../../../util/DeviceSize';

const margin = 16;
const width = Dimensions.get('window').width - margin * 2;
const height = Dimensions.get('window').height / (DeviceSize.isIphone5S() ? 4 : 5);
let paddingTop = Dimensions.get('window').height - 190;
if (DeviceSize.isIphoneX()) {
	paddingTop -= 65;
}

if (Platform.OS === 'android') {
	paddingTop -= 10;
}

const styles = StyleSheet.create({
	tabFavicon: {
		alignSelf: 'flex-start',
		width: 24,
		height: 24,
		marginRight: 5,
		marginLeft: 2,
		marginTop: 1
	},
	tabSiteName: {
		color: colors.white,
		...fontStyles.bold,
		fontSize: 24,
		marginRight: 40,
		marginLeft: 5,
		marginTop: Platform.OS === 'ios' ? 0 : -5
	},
	tabHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'flex-start',
		backgroundColor: colors.grey500,
		paddingVertical: 15,
		paddingHorizontal: 10,
		minHeight: 25
	},
	tabWrapper: {
		marginBottom: 20,
		borderRadius: 10,
		elevation: 8,
		justifyContent: 'space-evenly',
		overflow: 'hidden',
		borderColor: colors.grey100,
		borderWidth: 1,
		width,
		height
	},
	checkWrapper: {
		backgroundColor: colors.transparent,
		overflow: 'hidden'
	},
	tab: {
		backgroundColor: colors.white,
		flex: 1,
		alignItems: 'flex-start',
		justifyContent: 'flex-start'
	},
	tabImage: {
		...StyleSheet.absoluteFillObject,
		paddingTop,
		width: null,
		height: null,
		resizeMode: 'cover'
	},
	activeTab: {
		borderWidth: 5,
		borderColor: colors.blue
	},
	closeTabIcon: {
		paddingHorizontal: 10,
		paddingTop: 3,
		fontSize: 38,
		color: colors.white,
		right: 0,
		marginTop: -7,
		position: 'absolute'
	},
	titleButton: {
		backgroundColor: colors.transparent,
		flex: 1,
		flexDirection: 'row',
		marginRight: 40
	},
	closeTabButton: {
		backgroundColor: colors.transparent,
		width: 36,
		height: 36
	}
});

const HOMEPAGE_URL = 'about:blank';
const METAMASK_FOX = require('../../../../images/fox.png'); // eslint-disable-line import/no-commonjs

/**
 * Component that renders an a thumbnail
 * that represents an existing tab
 */
export default class TabThumbnail extends Component {
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
		onSwitch: PropTypes.func
	};

	getHostName = () => {
		const urlObj = new URL(this.props.tab.url);
		return urlObj.hostname.toLowerCase().replace('www.', '');
	};

	getContainer = () => (Platform.OS === 'android' ? View : ElevatedView);

	render() {
		const { isActiveTab, tab, onClose, onSwitch } = this.props;
		const Container = this.getContainer();
		const hostname = this.getHostName();

		return (
			<Container style={styles.checkWrapper} elevation={8}>
				<View style={[styles.tabWrapper, isActiveTab && styles.activeTab]}>
					<View style={styles.tabHeader}>
						<TouchableOpacity
							onPress={() => onSwitch(tab)} // eslint-disable-line react/jsx-no-bind
							style={styles.titleButton}
						>
							{tab.url !== HOMEPAGE_URL ? (
								<WebsiteIcon transparent style={styles.tabFavicon} title={hostname} url={tab.url} />
							) : (
								<Image style={styles.tabFavicon} title={tab.url} source={METAMASK_FOX} />
							)}
							<Text style={styles.tabSiteName} numberOfLines={1}>
								{tab.url === HOMEPAGE_URL ? strings('browser.new_tab') : hostname}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => onClose(tab)} // eslint-disable-line react/jsx-no-bind
							style={styles.closeTabButton}
						>
							<IonIcon name="ios-close" style={styles.closeTabIcon} />
						</TouchableOpacity>
					</View>
					<TouchableOpacity
						style={styles.tab}
						// eslint-disable-next-line react/jsx-no-bind
						onPress={() => onSwitch(tab)}
					>
						<Image source={{ uri: tab.image }} style={styles.tabImage} />
					</TouchableOpacity>
				</View>
			</Container>
		);
	}
}
