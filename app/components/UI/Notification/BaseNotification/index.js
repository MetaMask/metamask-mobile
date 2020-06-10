import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles, baseStyles } from '../../../../styles/common';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedSpinner from '../../AnimatedSpinner';
import { strings } from '../../../../../locales/i18n';
import IonicIcon from 'react-native-vector-icons/Ionicons';

const styles = StyleSheet.create({
	defaultFlashFloating: {
		flex: 1,
		backgroundColor: colors.normalAlert,
		padding: 16,
		marginHorizontal: 8,
		flexDirection: 'row',
		borderRadius: 8
	},
	flashLabel: {
		flex: 1,
		flexDirection: 'column',
		color: colors.white
	},
	flashText: {
		fontSize: 12,
		lineHeight: 18,
		color: colors.white
	},
	flashTitle: {
		flex: 1,
		fontSize: 14,
		marginBottom: 2,
		lineHeight: 18,
		color: colors.white,
		...fontStyles.bold
	},
	flashIcon: {
		marginRight: 15
	},
	closeTouchable: {
		flex: 0.1,
		flexDirection: 'column',
		alignItems: 'flex-end'
	},
	closeIcon: {
		flex: 1,
		color: colors.white,
		alignItems: 'flex-start',
		marginTop: -8
	}
});

/**
 * BaseNotification component used to render in-app notifications
 */
export default function BaseNotification(props) {
	const { status, data, onPress, onHide } = props;
	// eslint-disable-next-line
	_getIcon = () => {
		switch (status) {
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
				return <IonicIcon color={colors.green500} size={36} name="md-checkmark" style={styles.checkIcon} />;
			case 'cancelled':
			case 'error':
				return (
					<MaterialIcon color={colors.red} size={36} name="alert-circle-outline" style={styles.checkIcon} />
				);
		}
	};

	// eslint-disable-next-line no-undef
	_getTitle = () => {
		switch (status) {
			case 'pending':
				return strings('notifications.pending_title');
			case 'pending_deposit':
				return strings('notifications.pending_deposit_title');
			case 'pending_withdrawal':
				return strings('notifications.pending_withdrawal_title');
			case 'success':
				return strings('notifications.success_title', { nonce: parseInt(data.nonce) });
			case 'success_deposit':
				return strings('notifications.success_deposit_title');
			case 'success_withdrawal':
				return strings('notifications.success_withdrawal_title');
			case 'received':
				return strings('notifications.received_title', {
					amount: data.amount,
					assetType: data.assetType
				});
			case 'speedup':
				return strings('notifications.speedup_title', { nonce: parseInt(data.nonce) });
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
		if (data && data.amount) {
			return strings(`notifications.${status}_message`, { amount: data.amount });
		}
		return strings(`notifications.${status}_message`);
	};

	return (
		<View style={baseStyles.flexGrow}>
			<TouchableOpacity
				style={styles.defaultFlashFloating}
				testID={'press-notification-button'}
				onPress={onPress}
				activeOpacity={0.8}
			>
				<View style={styles.flashIcon}>{this._getIcon()}</View>
				<View style={styles.flashLabel}>
					<Text style={styles.flashTitle} testID={'notification-title'}>
						{this._getTitle()}
					</Text>
					<Text style={styles.flashText}>{this._getDescription()}</Text>
				</View>
				<TouchableOpacity style={styles.closeTouchable} onPress={onHide}>
					<IonicIcon name="ios-close" size={36} style={styles.closeIcon} />
				</TouchableOpacity>
			</TouchableOpacity>
		</View>
	);
}

BaseNotification.propTypes = {
	status: PropTypes.string,
	data: PropTypes.object,
	onPress: PropTypes.func,
	onHide: PropTypes.func
};
