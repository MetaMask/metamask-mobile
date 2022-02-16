import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { SafeAreaView, View } from 'react-native';
import { baseStyles } from '../../../styles/common';

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

	// With theme, this probably isn't needed anymore
	// componentDidMount() {
	// 	StatusBar.setBarStyle('dark-content', true);
	// 	if (Device.isAndroid()) {
	// 		StatusBar.setBackgroundColor(colors.grey100);
	// 	}
	// }

	render() {
		return (
			<View style={baseStyles.flexGrow}>
				<SafeAreaView style={baseStyles.flexGrow}>{this.props.children}</SafeAreaView>
			</View>
		);
	}
}
