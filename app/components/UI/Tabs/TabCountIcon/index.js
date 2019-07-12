import React, { Component } from 'react';
import { Platform, View, StyleSheet, Text } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../../styles/common';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	tabIcon: {
		borderWidth: 2,
		borderColor: colors.grey500,
		borderRadius: 6,
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
		 * Switches to a specific tab
		 */
		tabCount: PropTypes.number,
		/**
		 * Component styles
		 */
		style: PropTypes.any
	};

	render() {
		const { tabCount, style } = this.props;

		return (
			<View style={[styles.tabIcon, style]}>
				<Text styles={styles.tabCount}>{tabCount}</Text>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	tabCount: state.browser.tabs.length
});

export default connect(mapStateToProps)(TabCountIcon);
