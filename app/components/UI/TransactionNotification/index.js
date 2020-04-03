import React, { Fragment } from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import ElevatedView from 'react-native-elevated-view';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedSpinner from '../AnimatedSpinner';
import { hideMessage } from 'react-native-flash-message';
import { strings } from '../../../../locales/i18n';
import GestureRecognizer from 'react-native-swipe-gestures';
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
	touchableContainer: {
		flex: 1,
		flexDirection: 'row'
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
 * TransactionNotification component used to render
 * in-app notifications for the transctions
 */
export default function TransactionNotification(props) {
	const { type, transaction, onPress, onHide } = props;

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
	// _onPress = () => {
	// 	if (callback) {
	// 		hideMessage();
	// 		setTimeout(() => {
	// 			callback();
	// 		}, 300);
	// 	}
	// };

	return (
		<ElevatedView elevation={10} style={baseStyles.flexGrow}>
			<GestureRecognizer
				testID={'notification-swipe'}
				onSwipeDown={hideMessage}
				config={{
					velocityThreshold: 0.2,
					directionalOffsetThreshold: 50
				}}
				style={[styles.defaultFlashFloating]}
			>
				<TouchableOpacity
					style={styles.touchableContainer}
					testID={'press-notification-button'}
					onPress={onPress}
					activeOpacity={0.8}
				>
					<Fragment>
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
					</Fragment>
				</TouchableOpacity>
			</GestureRecognizer>
		</ElevatedView>
	);
}

TransactionNotification.propTypes = {
	type: PropTypes.string,
	transaction: PropTypes.object,
	onPress: PropTypes.func,
	onHide: PropTypes.func
};
