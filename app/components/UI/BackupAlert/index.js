import React, { PureComponent } from 'react';
import { Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ElevatedView from 'react-native-elevated-view';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';

const styles = StyleSheet.create({
	backupAlertWrapper: {
		padding: 9,
		flexDirection: 'row',
		backgroundColor: colors.orange000,
		borderWidth: 1,
		borderColor: colors.yellow200,
		borderRadius: 8
	},
	backupAlertIconWrapper: {
		marginRight: 13
	},
	backupAlertIcon: {
		fontSize: 22,
		color: colors.yellow700
	},
	backupAlertTitle: {
		fontSize: 12,
		lineHeight: 17,
		color: colors.yellow700,
		...fontStyles.bold
	},
	backupAlertMessage: {
		fontSize: 10,
		lineHeight: 14,
		color: colors.yellow700,
		...fontStyles.normal
	}
});

/**
 * PureComponent that renders an alert shown when the
 * seed phrase hasn't been backed up
 */
export default class BackupAlert extends PureComponent {
	static propTypes = {
		/**
		 * The action that will be triggered onPress
		 */
		onPress: PropTypes.any,
		/**
		 * Styles for the alert
		 */
		style: PropTypes.any
	};

	render() {
		const { onPress, style } = this.props;

		return (
			<TouchableOpacity onPress={onPress} style={style}>
				<ElevatedView elevation={4} style={styles.backupAlertWrapper}>
					<View style={styles.backupAlertIconWrapper}>
						<Icon name="info-outline" style={styles.backupAlertIcon} />
					</View>
					<View>
						<Text style={styles.backupAlertTitle}>{strings('browser.backup_alert_title')}</Text>
						<Text style={styles.backupAlertMessage}>{strings('browser.backup_alert_message')}</Text>
					</View>
				</ElevatedView>
			</TouchableOpacity>
		);
	}
}
