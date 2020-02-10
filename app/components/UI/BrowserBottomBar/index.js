import React, { PureComponent } from 'react';
import { TouchableOpacity, Platform, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import ElevatedView from 'react-native-elevated-view';
import TabCountIcon from '../Tabs/TabCountIcon';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';
import FeatherIcons from 'react-native-vector-icons/Feather';
import { colors } from '../../../styles/common';

const styles = StyleSheet.create({
	bottomBar: {
		backgroundColor: Platform.OS === 'android' ? colors.white : colors.grey000,
		flexDirection: 'row',
		flex: 0,
		borderTopWidth: Platform.OS === 'android' ? 0 : StyleSheet.hairlineWidth,
		borderColor: colors.grey200,
		justifyContent: 'space-between'
	},
	iconButton: {
		height: 24,
		width: 24,
		justifyContent: 'space-around',
		alignItems: 'center',
		textAlign: 'center',
		padding: 30
	},
	tabIcon: {
		marginTop: 0,
		width: 24,
		height: 24
	},
	disabledIcon: {
		color: colors.grey100
	},
	icon: {
		width: 24,
		height: 24,
		color: colors.grey500,
		textAlign: 'center'
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
		 * Function that redirects to the home screen
		 */
		goHome: PropTypes.func,
		/**
		 * Function that toggles the options menu
		 */
		toggleOptions: PropTypes.func
	};

	render() {
		const {
			canGoBack,
			goBack,
			canGoForward,
			goForward,
			showTabs,
			goHome,
			showUrlModal,
			toggleOptions
		} = this.props;

		return (
			<ElevatedView elevation={11} style={styles.bottomBar}>
				<TouchableOpacity
					onPress={goBack}
					style={styles.iconButton}
					testID={'go-back-button'}
					disabled={!canGoBack}
				>
					<Icon name="angle-left" size={24} style={[styles.icon, !canGoBack ? styles.disabledIcon : {}]} />
				</TouchableOpacity>
				<TouchableOpacity
					onPress={goForward}
					style={styles.iconButton}
					testID={'go-forward-button'}
					disabled={!canGoForward}
				>
					<Icon
						name="angle-right"
						size={24}
						style={[styles.icon, !canGoForward ? styles.disabledIcon : {}]}
					/>
				</TouchableOpacity>
				<TouchableOpacity onPress={showUrlModal} style={styles.iconButton} testID={'search-button'}>
					<FeatherIcons name="search" size={24} style={styles.icon} />
				</TouchableOpacity>

				<TouchableOpacity onPress={showTabs} style={styles.iconButton} testID={'show-tabs-button'}>
					<TabCountIcon style={styles.tabIcon} />
				</TouchableOpacity>
				<TouchableOpacity onPress={goHome} style={styles.iconButton} testID={'home-button'}>
					<SimpleLineIcons name="home" size={22} style={styles.icon} />
				</TouchableOpacity>

				<TouchableOpacity onPress={toggleOptions} style={styles.iconButton} testID={'options-button'}>
					<MaterialIcon name="more-horiz" size={22} style={styles.icon} />
				</TouchableOpacity>
			</ElevatedView>
		);
	}
}
