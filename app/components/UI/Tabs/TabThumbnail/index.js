import React, { Component } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Text, Dimensions } from 'react-native';
import PropTypes from 'prop-types';
import ElevatedView from 'react-native-elevated-view';
import WebsiteIcon from '../../WebsiteIcon';
import { strings } from '../../../../../locales/i18n';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { colors, fontStyles } from '../../../../styles/common';
import URL from 'url-parse';

const margin = 16;
const width = Dimensions.get('window').width - margin * 2;

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
		marginLeft: 5
	},
	tabHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'flex-start',
		backgroundColor: colors.overlay,
		paddingVertical: 15,
		paddingHorizontal: 10,
		minHeight: 25
	},
	tabWrapper: {
		marginBottom: 20,
		borderRadius: 10,
		justifyContent: 'space-evenly',
		overflow: 'hidden',
		borderColor: colors.grey100,
		borderWidth: 1,
		width,
		height: Dimensions.get('window').height / 5
	},
	tab: {
		backgroundColor: colors.white,
		flex: 1,
		alignItems: 'flex-start',
		justifyContent: 'flex-start'
	},
	tabImage: {
		...StyleSheet.absoluteFillObject,
		paddingTop: 560,
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
		flex: 1,
		flexDirection: 'row',
		marginRight: 40
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

	render() {
		const { isActiveTab, tab, onClose, onSwitch } = this.props;

		return (
			<ElevatedView style={styles.checkWrapper} elevation={8}>
				<View style={[styles.tabWrapper, isActiveTab && styles.activeTab]}>
					<View style={styles.tabHeader}>
						<TouchableOpacity
							onPress={() => onSwitch(tab)} // eslint-disable-line react/jsx-no-bind
							style={styles.titleButton}
						>
							{tab.url !== HOMEPAGE_URL ? (
								<WebsiteIcon style={styles.tabFavicon} title={tab.url} url={tab.url} />
							) : (
								<Image style={styles.tabFavicon} title={tab.url} source={METAMASK_FOX} />
							)}
							<Text style={styles.tabSiteName} numberOfLines={1}>
								{tab.url === HOMEPAGE_URL ? strings('browser.new_tab') : this.getHostName()}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => onClose(tab)} // eslint-disable-line react/jsx-no-bind
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
			</ElevatedView>
		);
	}
}
