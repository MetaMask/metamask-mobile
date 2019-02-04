import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import PropTypes from 'prop-types';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FoundationIcon from 'react-native-vector-icons/Foundation';
import StyledButton from '../StyledButton';
import { colors, fontStyles } from '../../styles/common';

const styles = StyleSheet.create({
	buttons: {
		flex: 1,
		flexDirection: 'row',
		marginTop: 30
	},
	button: {
		flex: 1,
		height: 50,
		flexDirection: 'row'
	},
	leftButton: {
		marginRight: 10
	},
	rightButton: {
		marginLeft: 10
	},
	buttonText: {
		marginLeft: 8,
		marginTop: Platform.OS === 'ios' ? 0 : -2,
		fontSize: 15,
		color: colors.white,
		...fontStyles.bold
	},
	buttonContent: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'center'
	},
	buttonIcon: {
		width: 15,
		height: 15,
		marginTop: 0
	},
	flexRow: {
		flexDirection: 'row'
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
		 * Callback triggered on right button press
		 */
		onRightPress: PropTypes.func,
		/**
		 * String to display on left button
		 */
		rightText: PropTypes.string
	};

	render = () => {
		const { onLeftPress, onRightPress, leftText, rightText } = this.props;
		return (
			<View style={styles.buttons}>
				<StyledButton
					type={'confirm'}
					onPress={onLeftPress}
					containerStyle={[styles.button, styles.leftButton]}
					style={styles.buttonContent}
					childGroupStyle={styles.flexRow}
				>
					<MaterialIcon name={'send'} size={15} color={colors.white} style={styles.buttonIcon} />
					<Text style={styles.buttonText}>{leftText}</Text>
				</StyledButton>
				<StyledButton
					type={'confirm'}
					onPress={onRightPress}
					containerStyle={[styles.button, styles.rightButton]}
					style={styles.buttonContent}
					childGroupStyle={styles.flexRow}
				>
					<FoundationIcon name={'download'} size={20} color={colors.white} style={styles.buttonIcon} />
					<Text style={styles.buttonText}>{rightText}</Text>
				</StyledButton>
			</View>
		);
	};
}
