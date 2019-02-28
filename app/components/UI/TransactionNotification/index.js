import React, { Fragment } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';
import { colors, baseStyles, fontStyles } from '../../../styles/common';
import ElevatedView from 'react-native-elevated-view';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import DeviceSize from '../../../util/DeviceSize';
import AnimatedSpinner from '../AnimatedSpinner';
import { hideMessage } from 'react-native-flash-message';
import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
	defaultFlashFloating: {
		backgroundColor: colors.normalAlert,
		padding: 15,
		marginTop: 10,
		marginLeft: 0,
		marginRight: 0,
		height: DeviceSize.isIphoneX() ? 90 : 70,
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
				return (
					<MaterialIcon
						color={colors.darkRed}
						size={36}
						name="alert-circle-outline"
						style={styles.checkIcon}
					/>
				);
		}
	};

	// eslint-disable-next-line no-undef
	_getTitle = () => {
		switch (type) {
			case 'pending':
				return strings('notifications.pending_title');
			case 'success':
				return strings('notifications.success_title', { nonce: transaction.nonce });
			case 'received':
				return strings('notifications.received_title', {
					amount: transaction.amount,
					assetType: transaction.assetType
				});
			case 'error':
				return strings('notifications.error_title');
		}
	};

	// eslint-disable-next-line no-undef
	_getDescription = () => strings(`notifications.${type}_message`);

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
