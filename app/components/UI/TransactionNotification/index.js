import React, { Fragment } from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import PropTypes from 'prop-types';
import { colors, baseStyles, fontStyles } from '../../../styles/common';
import ElevatedView from 'react-native-elevated-view';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Device from '../../../util/Device';
import AnimatedSpinner from '../AnimatedSpinner';
import { hideMessage } from 'react-native-flash-message';
import { strings } from '../../../../locales/i18n';
import GestureRecognizer from 'react-native-swipe-gestures';

const styles = StyleSheet.create({
	defaultFlashFloating: {
		backgroundColor: colors.normalAlert,
		padding: 15,
		marginTop: 10,
		marginLeft: 0,
		marginRight: 0,
		height: Device.isIphoneX() ? 90 : 70,
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
		marginRight: 15
	}
});

/**
 * TransactionNotification component used to render
 * in-app notifications for the transctions
 */
// eslint-disable-next-line import/prefer-default-export
export const TransactionNotification = props => {
	const {
		message: {
			type,
			message: { transaction, callback }
		}
	} = props;

	// eslint-disable-next-line
	_getIcon = () => {
		switch (type) {
			case 'pending':
			case 'pending_withdrawal':
			case 'pending_deposit':
			case 'speedup':
				return <AnimatedSpinner size={36} />;
			case 'success_deposit':
			case 'success_withdrawal':
			case 'success':
			case 'received':
			case 'received_payment':
				return <Icon color={colors.green500} size={36} name="md-checkmark" style={styles.checkIcon} />;
			case 'cancelled':
			case 'error':
				return (
					<MaterialIcon color={colors.red} size={36} name="alert-circle-outline" style={styles.checkIcon} />
				);
		}
	};

	// eslint-disable-next-line no-undef
	_getTitle = () => {
		switch (type) {
			case 'pending':
				return strings('notifications.pending_title');
			case 'pending_deposit':
				return strings('notifications.pending_deposit_title');
			case 'pending_withdrawal':
				return strings('notifications.pending_withdrawal_title');
			case 'success':
				return strings('notifications.success_title', { nonce: transaction.nonce });
			case 'success_deposit':
				return strings('notifications.success_deposit_title');
			case 'success_withdrawal':
				return strings('notifications.success_withdrawal_title');
			case 'received':
				return strings('notifications.received_title', {
					amount: transaction.amount,
					assetType: transaction.assetType
				});
			case 'speedup':
				return strings('notifications.speedup_title', { nonce: transaction.nonce });
			case 'received_payment':
				return strings('notifications.received_payment_title');
			case 'cancelled':
				return strings('notifications.cancelled_title');
			case 'error':
				return strings('notifications.error_title');
		}
	};

	// eslint-disable-next-line no-undef
	_getDescription = () => {
		if (transaction && transaction.amount) {
			return strings(`notifications.${type}_message`, { amount: transaction.amount });
		}
		return strings(`notifications.${type}_message`);
	};

	// eslint-disable-next-line
	_getContent = () => (
		<Fragment>
			<View style={styles.flashIcon}>{this._getIcon()}</View>
			<View style={styles.flashLabel}>
				<Text style={styles.flashTitle} testID={'notification-title'}>
					{this._getTitle()}
				</Text>
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
			<GestureRecognizer
				// eslint-disable-next-line react/jsx-no-bind
				testID={'notification-swipe'}
				onSwipeDown={() => hideMessage()}
				config={{
					velocityThreshold: 0.2,
					directionalOffsetThreshold: 50
				}}
				style={baseStyles.flex}
			>
				<TouchableOpacity
					style={[styles.defaultFlash, styles.defaultFlashFloating]}
					testID={'press-notification-button'}
					onPress={this._onPress}
					activeOpacity={0.8}
				>
					{this._getContent()}
				</TouchableOpacity>
			</GestureRecognizer>
		</ElevatedView>
	);
};

TransactionNotification.propTypes = {
	message: PropTypes.object
};
