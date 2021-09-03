import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { SafeAreaView, StatusBar, View } from 'react-native';
import { colors, baseStyles } from '../../../styles/common';
import Device from '../../../util/device';
/**
 * Base view component providing consistent styling meant to wrap other views
 */
export default class Screen extends PureComponent {
	static propTypes = {
		/**
		 * Content to wrap inside this view
		 */
		children: PropTypes.node,
	};

	componentDidMount() {
		StatusBar.setBarStyle('dark-content', true);
		if (Device.isAndroid()) {
			StatusBar.setBackgroundColor(colors.grey100);
		}
	}

	render() {
		return (
			<View style={baseStyles.flexGrow}>
				<SafeAreaView style={baseStyles.flexGrow}>{this.props.children}</SafeAreaView>
			</View>
		);
	}
}
