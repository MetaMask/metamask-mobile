import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicon from 'react-native-vector-icons/Ionicons';
import { colors, fontStyles } from '../../../styles/common';

const styles = StyleSheet.create({
	buttons: {
		flexDirection: 'row',
		width: '50%',
		alignContent: 'center',
		alignItems: 'center'
	},
	button: {
		flex: 1,
		justifyContent: 'center',
		alignContent: 'center',
		alignItems: 'center'
	},
	buttonIconWrapper: {
		width: 36,
		height: 36,
		paddingTop: Platform.OS === 'android' ? 2 : 4,
		paddingLeft: 1,
		justifyContent: 'center',
		alignContent: 'center',
		color: colors.white,
		borderRadius: 18,
		backgroundColor: colors.primary
	},
	buttonIcon: {
		justifyContent: 'center',
		alignContent: 'center',
		textAlign: 'center',
		color: colors.white
	},
	buttonText: {
		marginTop: 12,
		textAlign: 'center',
		color: colors.primary,
		fontSize: 11,
		...fontStyles.normal
	},
	sendIcon: {
		paddingTop: 0,
		paddingLeft: 0
	}
});

/**
 * View that displays two action buttons for asset overview
 */
export default class AssetActionButtons extends Component {
	static propTypes = {
		/**
		 * String to display on left button
		 */
		leftText: PropTypes.string,
		/**
		 * Callback triggered on left button press
		 */
		onLeftPress: PropTypes.func,
		/**
		 * Callback triggered on middle button press
		 */
		onMiddlePress: PropTypes.func,
		/**
		 * Callback triggered on right button press
		 */
		onRightPress: PropTypes.func,
		/**
		 * String to display on middle button
		 */
		middleText: PropTypes.string,
		/**
		 * String to display on left button
		 */
		rightText: PropTypes.string
	};

	render() {
		const { onLeftPress, onMiddlePress, onRightPress, leftText, middleText, rightText } = this.props;
		return (
			<View style={styles.buttons}>
				{leftText && (
					<TouchableOpacity type={'normal'} onPress={onLeftPress} style={styles.button}>
						<View style={styles.buttonIconWrapper}>
							<MaterialCommunityIcon
								name={'arrow-top-right'}
								size={20}
								color={colors.primary}
								style={[styles.buttonIcon, styles.sendIcon]}
							/>
						</View>
						<Text style={styles.buttonText}>{leftText}</Text>
					</TouchableOpacity>
				)}

				<TouchableOpacity type={'normal'} onPress={onMiddlePress} style={styles.button}>
					<View style={styles.buttonIconWrapper}>
						<Ionicon name={'ios-add'} size={30} color={colors.white} style={styles.buttonIcon} />
					</View>
					<Text style={styles.buttonText}>{middleText}</Text>
				</TouchableOpacity>

				{rightText && (
					<TouchableOpacity type={'normal'} onPress={onRightPress} style={styles.button}>
						<View style={styles.buttonIconWrapper}>
							<Ionicon name={'md-information'} size={30} color={colors.white} style={styles.buttonIcon} />
						</View>
						<Text style={styles.buttonText}>{rightText}</Text>
					</TouchableOpacity>
				)}
			</View>
		);
	}
}
