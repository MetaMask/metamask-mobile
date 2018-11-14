import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, ImageBackground, View } from 'react-native';
import { colors } from '../../styles/common';

const styles = StyleSheet.create({
	flex: {
		flex: 1,
		backgroundColor: colors.white
	},
	wrapper: {
		borderTopWidth: 0,
		borderColor: colors.white,
		backgroundColor: colors.white,
		flex: 1,
		width: null,
		height: null,
		resizeMode: 'cover'
	}
});

const OnboardingScreenWithBg = props => (
	<View style={styles.flex}>
		<ImageBackground source={require('../../images/bg.png')} style={styles.wrapper} resizeMode={'cover'}>
			{props.children}
		</ImageBackground>
	</View>
);

OnboardingScreenWithBg.propTypes = {
	/**
	 * Children components of the GenericButton
	 * it can be a text node, an image, or an icon
	 * or an Array with a combination of them
	 */
	children: PropTypes.any
};

export default OnboardingScreenWithBg;
