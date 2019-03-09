import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Platform, SafeAreaView, StatusBar, View } from 'react-native';
import { colors, baseStyles } from '../../../styles/common';
/**
 * Base view component providing consistent styling meant to wrap other views
 */
export default class Screen extends Component {
	static propTypes = {
		/**
		 * Content to wrap inside this view
		 */
		children: PropTypes.node
	};

	componentDidMount() {
		StatusBar.setBarStyle('dark-content', true);
		StatusBar.setBackgroundColor(Platform.OS === 'android' ? colors.androidStatusbar : colors.white);
	}

	render() {
		return (
			<View style={baseStyles.flexGrow}>
				<SafeAreaView style={baseStyles.flexGrow}>{this.props.children}</SafeAreaView>
			</View>
		);
	}
}
