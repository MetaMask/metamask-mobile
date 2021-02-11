import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles, baseStyles } from '../../../../styles/common';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedSpinner from '../../AnimatedSpinner';
import { strings } from '../../../../../locales/i18n';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import AntIcon from 'react-native-vector-icons/AntDesign';

const styles = StyleSheet.create({
	defaultFlashFloating: {
		backgroundColor: colors.normalAlert,
		padding: 16,
		marginHorizontal: 16,
		flexDirection: 'row',
		borderRadius: 8
	},
	flashLabel: {
		flex: 1,
		flexDirection: 'column',
		color: colors.white
	},
	flashText: {
		flex: 1,
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
	flashTitleNoDesc: {
		marginTop: 8,
		marginBottom: 0
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

const getIcon = status => {
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
			return <MaterialIcon color={colors.red} size={36} name="alert-circle-outline" style={styles.checkIcon} />;
		case 'simple_notification_rejected':
			return <AntIcon color={colors.red} size={36} name="closecircleo" style={styles.checkIcon} />;
		case 'simple_notification':
			return <AntIcon color={colors.green500} size={36} name="checkcircleo" style={styles.checkIcon} />;
	}
};

const getTitle = (status, { nonce, amount, assetType }) => {
	switch (status) {
		case 'pending':
			return strings('notifications.pending_title');
		case 'pending_deposit':
			return strings('notifications.pending_deposit_title');
		case 'pending_withdrawal':
			return strings('notifications.pending_withdrawal_title');
		case 'success':
			return strings('notifications.success_title', { nonce: parseInt(nonce) });
		case 'success_deposit':
			return strings('notifications.success_deposit_title');
		case 'success_withdrawal':
			return strings('notifications.success_withdrawal_title');
		case 'received':
			return strings('notifications.received_title', {
				amount,
				assetType
			});
		case 'speedup':
			return strings('notifications.speedup_title', { nonce: parseInt(nonce) });
		case 'received_payment':
			return strings('notifications.received_payment_title');
		case 'cancelled':
			return strings('notifications.cancelled_title');
		case 'error':
			return strings('notifications.error_title');
	}
};

const getDescription = (status, { amount = null }) => {
	if (amount) {
		return strings(`notifications.${status}_message`, { amount });
	}
	return strings(`notifications.${status}_message`);
};

/**
 * BaseNotification component used to render in-app notifications
 */
const BaseNotification = ({
	status,
	data = null,
	data: { description = null, title = null },
	onPress,
	onHide,
	autoDismiss
}) => (
	<View style={baseStyles.flexGrow}>
		<TouchableOpacity
			style={styles.defaultFlashFloating}
			testID={'press-notification-button'}
			onPress={onPress}
			activeOpacity={0.8}
		>
			<View style={styles.flashIcon}>{getIcon(status)}</View>
			<View style={styles.flashLabel}>
				<Text
					style={[styles.flashTitle, !description && styles.flashTitleNoDesc]}
					testID={'notification-title'}
				>
					{!title ? getTitle(status, data) : title}
				</Text>
				<Text style={styles.flashText}>{!title ? getDescription(status, data) : description}</Text>
			</View>
			<View>
				{autoDismiss && (
					<TouchableOpacity style={styles.closeTouchable} onPress={onHide}>
						<IonicIcon name="ios-close" size={36} style={styles.closeIcon} />
					</TouchableOpacity>
				)}
			</View>
		</TouchableOpacity>
	</View>
);

BaseNotification.propTypes = {
	status: PropTypes.string,
	data: PropTypes.object,
	onPress: PropTypes.func,
	onHide: PropTypes.func,
	autoDismiss: PropTypes.bool
};

BaseNotification.defaultProps = {
	autoDismiss: false
};

export default BaseNotification;
