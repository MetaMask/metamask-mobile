import React, { Component } from 'react';
import { Platform, TouchableOpacity, StyleSheet, Text } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../../styles/common';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	tabIcon: {
		borderWidth: Platform.OS === 'android' ? 2 : 3,
		borderColor: colors.grey500,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center'
	},
	tabCount: {
		color: colors.grey500,
		flex: 0,
		lineHeight: Platform.OS === 'android' ? 3 : 15,
		fontSize: Platform.OS === 'android' ? 3 : 15,
		textAlign: 'center',
		alignSelf: 'center',
		...fontStyles.normal
	}
});

/**
 * Component that renders an icon showing
 * the current number of open tabs
 */
class TabCountIcon extends Component {
	static propTypes = {
		/**
		 * Shows the tabs view
		 */
		onPress: PropTypes.func,
		/**
		 * Switches to a specific tab
		 */
		tabCount: PropTypes.number,
		/**
		 * Component styles
		 */
		style: PropTypes.any
	};

	render() {
		const { tabCount, onPress, style } = this.props;

		return (
			<TouchableOpacity style={[styles.tabIcon, style]} onPress={onPress}>
				<Text styles={styles.tabCount}>{tabCount}</Text>
			</TouchableOpacity>
		);
	}
}

const mapStateToProps = state => ({
	tabCount: state.browser.tabs.length
});

export default connect(mapStateToProps)(TabCountIcon);
