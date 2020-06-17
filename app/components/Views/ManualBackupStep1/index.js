import React, { PureComponent } from 'react';
import { ScrollView, Alert, Text, View, SafeAreaView, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	scrollviewWrapper: {
		flex: 1
	},
	wrapper: {
		flex: 1,
		padding: 30,
		paddingTop: 0
	},
	content: {
		alignItems: 'center'
	},
	action: {
		fontSize: 18,
		marginTop: 140,
		marginBottom: 16,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold
	},
	text: {
		marginBottom: 55,
		justifyContent: 'center'
	},
	info: {
		fontSize: 14,
		color: colors.fontPrimary,
		textAlign: 'center',
		...fontStyles.normal
	},
	buttonWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	}
});

/**
 * View that's shown during the second step of
 * the backup seed phrase flow
 */
export default class AccountBackupStep2 extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};

	dismiss = () => {
		Alert.alert(
			strings('account_backup_step_2.cancel_backup_title'),
			strings('account_backup_step_2.cancel_backup_message'),
			[
				{
					text: strings('account_backup_step_2.cancel_backup_ok'),
					onPress: () => {
						this.props.navigation.popToTop();
						this.props.navigation.goBack(null);
					}
				},
				{
					text: strings('account_backup_step_2.cancel_backup_no'),
					onPress: () => null,
					style: 'cancel'
				}
			],
			{ cancelable: false }
		);
	};

	goNext = () => {
		this.props.navigation.navigate('AccountBackupStep3', { ...this.props.navigation.state.params });
	};

	render() {
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<ScrollView
					contentContainerStyle={styles.scrollviewWrapper}
					style={styles.mainWrapper}
					testID={'manual_backup_step_1-screen'}
				>
					<View style={styles.wrapper} testID={'manual_backup_step_1-screen'}>
						<View style={styles.content}>
							<Text style={styles.action}>{strings('manual_backup_step_1.action')}</Text>
							<View style={styles.text}>
								<Text style={[styles.info]}>{strings('manual_backup_step_1.info')}</Text>
							</View>
						</View>
						<View style={styles.buttonWrapper}>
							<StyledButton
								containerStyle={styles.button}
								type={'confirm'}
								onPress={this.goNext}
								testID={'submit-button'}
							>
								{strings('manual_backup_step_1.continue')}
							</StyledButton>
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	}
}
