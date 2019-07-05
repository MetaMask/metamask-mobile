import React, { PureComponent } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import ElevatedView from 'react-native-elevated-view';
import TabCountIcon from '../Tabs/TabCountIcon';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';
import DeviceSize from '../../../util/DeviceSize';
import { colors } from '../../../styles/common';

const styles = StyleSheet.create({
	bottomBar: {
		height: Platform.OS === 'ios' && DeviceSize.isIphoneX() ? 86 : Platform.OS === 'android' ? 45 : 60,
		backgroundColor: Platform.OS === 'android' ? colors.white : colors.grey000,
		paddingTop: Platform.OS === 'ios' && DeviceSize.isIphoneX() ? 14 : Platform.OS === 'android' ? 8 : 12,
		paddingBottom: Platform.OS === 'ios' && DeviceSize.isIphoneX() ? 32 : 8,
		flexDirection: 'row',
		paddingHorizontal: 10,
		flex: 0,
		borderTopWidth: Platform.OS === 'android' ? 0 : StyleSheet.hairlineWidth,
		borderColor: colors.grey200
	},
	iconSearch: {
		alignSelf: 'flex-start',
		alignContent: 'flex-start'
	},
	iconMore: {
		alignSelf: 'flex-start',
		alignContent: 'flex-start'
	},
	iconsLeft: {
		flex: 1,
		alignContent: 'flex-start',
		flexDirection: 'row'
	},
	iconsMiddle: {
		flex: 1,
		alignContent: 'center',
		flexDirection: 'row',
		justifyContent: 'center'
	},
	iconsRight: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'flex-end',
		alignItems: 'center'
	},
	tabIcon: {
		marginTop: Platform.OS === 'ios' ? 0 : 2,
		width: Platform.OS === 'ios' ? 30 : 26,
		height: Platform.OS === 'ios' ? 30 : 26
	},
	disabledIcon: {
		color: colors.grey100
	},
	icon: {
		color: colors.grey500,
		height: 28,
		lineHeight: 30,
		textAlign: 'center',
		width: 36,
		alignSelf: 'center'
	}
});

/**
 * Browser bottom bar that contains icons for navigatio
 * tab management, url change and other options
 */
export default class BrowserBottomBar extends PureComponent {
	static propTypes = {
		/**
		 * Boolean that determines if you can navigate back
		 */
		canGoBack: PropTypes.bool,
		/**
		 * Boolean that determines if you can navigate forward
		 */
		canGoForward: PropTypes.bool,
		/**
		 * Function that allows you to navigate back
		 */
		goBack: PropTypes.func,
		/**
		 * Function that allows you to navigate forward
		 */
		goForward: PropTypes.func,
		/**
		 * Function that triggers the tabs view
		 */
		showTabs: PropTypes.func,
		/**
		 * Function that triggers the change url modal view
		 */
		showUrlModal: PropTypes.func,
		/**
		 * Function that toggles the options menu
		 */
		toggleOptions: PropTypes.func
	};

	render() {
		const { canGoBack, goBack, canGoForward, goForward, showTabs, showUrlModal, toggleOptions } = this.props;

		return (
			<ElevatedView elevation={11} style={styles.bottomBar}>
				<View style={styles.iconsLeft}>
					<Icon
						name="angle-left"
						disabled={!canGoBack}
						onPress={goBack}
						size={Platform.OS === 'android' ? 32 : 40}
						style={[styles.icon, !canGoBack ? styles.disabledIcon : {}]}
					/>
					<Icon
						disabled={!canGoForward}
						name="angle-right"
						onPress={goForward}
						size={Platform.OS === 'android' ? 32 : 40}
						style={[styles.icon, !canGoForward ? styles.disabledIcon : {}]}
					/>
				</View>
				<View style={styles.iconsMiddle}>
					<TabCountIcon onPress={showTabs} style={styles.tabIcon} />
				</View>
				<View style={styles.iconsRight}>
					<IonIcon
						name="ios-search"
						onPress={showUrlModal}
						size={Platform.OS === 'android' ? 24 : 30}
						style={[styles.icon, styles.iconSearch]}
					/>
					<MaterialIcon
						name="more-vert"
						onPress={toggleOptions}
						size={Platform.OS === 'android' ? 26 : 30}
						style={[styles.icon, styles.iconMore]}
					/>
				</View>
			</ElevatedView>
		);
	}
}
