import React, { Fragment } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';
import { colors, baseStyles, fontStyles } from '../../../styles/common';
import ElevatedView from 'react-native-elevated-view';
import Icon from 'react-native-vector-icons/Ionicons';
import DeviceSize from '../../../util/DeviceSize';
import AnimatedSpinner from '../AnimatedSpinner';
import { hideMessage } from 'react-native-flash-message';
/**
 * MessageComponent `minHeight` property used mainly in vertical transitions
 */
const styles = StyleSheet.create({
	defaultFlashFloating: {
		backgroundColor: colors.normalAlert,
		padding: 20,
		marginTop: 10,
		marginLeft: 0,
		marginRight: 0,
		height: DeviceSize.isIphoneX() ? 100 : 80,
		flexDirection: 'row'
	},
	flashLabel: {
		flexDirection: 'column',
		color: colors.white
	},
	flashText: {
		fontSize: 12,
		lineHeight: 18,
		color: colors.white
	},
	flashTitle: {
		fontSize: 14,
		marginBottom: 2,
		lineHeight: 18,
		color: colors.white,
		...fontStyles.bold
	},
	flashIcon: {
		marginRight: 20
	}
});

/**
 */
// eslint-disable-next-line import/prefer-default-export
export const TransactionNotification = props => {
	const {
		message: {
			type,
			message: { transaction, callback }
		}
	} = props;

	// eslint-disable-next-line no-undef
	_getIcon = () => {
		switch (type) {
			case 'pending':
				return <AnimatedSpinner size={36} />;
			case 'success':
				return <Icon color={colors.success} size={36} name="md-checkmark" style={styles.checkIcon} />;
			case 'received':
				return <Icon color={colors.success} size={36} name="md-checkmark" style={styles.checkIcon} />;
			case 'error':
				return null;
		}
	};

	// eslint-disable-next-line no-undef
	_getTitle = () => {
		switch (type) {
			case 'pending':
				return 'Waiting for confirmation...';
			case 'success':
				return `Transaction #${transaction.nonce} Complete!`;
			case 'received':
				return `You received ${transaction.amount} ${transaction.assetType}!`;
			case 'error':
				return 'Oops, something went wrong :/';
		}
	};

	// eslint-disable-next-line no-undef
	_getDescription = () => {
		switch (type) {
			case 'pending':
				return 'Your transaction is in progress';
			case 'success':
				return 'Tap to view this transaction';
			case 'received':
				return 'Tap to view this transaction';
			case 'error':
				return 'Tap to view this transaction';
		}
	};

	// eslint-disable-next-line
	_getContent = () => (
		<Fragment>
			<View style={styles.flashIcon}>{this._getIcon()}</View>
			<View style={styles.flashLabel}>
				<Text style={styles.flashTitle}>{this._getTitle()}</Text>
				<Text style={styles.flashText}>{this._getDescription()}</Text>
			</View>
		</Fragment>
	);

	// eslint-disable-next-line
	_onPress = () => {
		if (callback) {
			hideMessage();
			setTimeout(() => {
				callback();
			}, 300);
		}
	};

	return (
		<ElevatedView elevation={10} style={baseStyles.flex}>
			{type === 'pending' ? (
				<View style={[styles.defaultFlash, styles.defaultFlashFloating]}>{this._getContent()}</View>
			) : (
				<TouchableOpacity style={[styles.defaultFlash, styles.defaultFlashFloating]} onPress={this._onPress}>
					{this._getContent()}
				</TouchableOpacity>
			)}
		</ElevatedView>
	);
};

TransactionNotification.propTypes = {
	message: PropTypes.object
};
