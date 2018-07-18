import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Dimensions, SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { colors, baseStyles } from '../../styles/common';

const styles = StyleSheet.create({
	underlay: {
		backgroundColor: colors.tar,
		left: 0,
		position: 'absolute',
		top: 0
	}
});

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

	render() {
		const { height, width } = Dimensions.get('window');

		return (
			<View style={baseStyles.flexGrow}>
				<View style={{ ...styles.underlay, ...{ width, height } }}>
					<StatusBar backgroundColor={colors.tar} barStyle="light-content" />
				</View>
				<SafeAreaView style={baseStyles.flexGrow}>{this.props.children}</SafeAreaView>
			</View>
		);
	}
}
