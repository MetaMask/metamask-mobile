import React, { PureComponent } from 'react';
import { ScrollView, Text, Image, View, SafeAreaView, StyleSheet, TouchableOpacity } from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Emoji from 'react-native-emoji';
import Pager from '../../UI/Pager';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import { strings } from '../../../../locales/i18n';
import CustomAlert from '../../UI/CustomAlert';
import { showAlert } from '../../../actions/alert';
import AndroidBackHandler from '../AndroidBackHandler';
import Device from '../../../util/Device';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flexGrow: 1,
		padding: 30,
		paddingTop: 0
	},
	content: {
		alignItems: 'flex-start'
	},
	title: {
		fontSize: 32,
		marginTop: 20,
		marginBottom: 20,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'left',
		...fontStyles.normal
	},
	text: {
		marginBottom: 10,
		justifyContent: 'center'
	},
	label: {
		fontSize: 16,
		lineHeight: 23,
		color: colors.fontPrimary,
		textAlign: 'left',
		...fontStyles.normal
	},
	emoji: {
		textAlign: 'left',
		fontSize: 75
	},
	buttonWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	},
	bullet: {
		marginRight: 5
	},
	bulletPoint: {
		flexDirection: 'row',
		marginBottom: 15
	},
	copy: {
		flexDirection: 'row',
		marginBottom: 15,
		marginLeft: 10
	},
	tips: {
		marginTop: 20
	},
	disclaimer: {
		marginTop: 20
	},
	singleBold: {
		...fontStyles.bold
	},
	foxBadge: {
		marginTop: 40,
		width: 75,
		height: 75
	},
	succesModalText: {
		textAlign: 'center',
		fontSize: 13,
		...fontStyles.normal
	}
});

/**
 * View that's shown during the last step of
 * the backup seed phrase flow
 */
class AccountBackupStep6 extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object,
		/**
		/* Triggers global alert
		*/
		showAlert: PropTypes.func
	};

	state = {
		showSuccessModal: false
	};

	showModal = () => {
		this.setState({ showSuccessModal: true });
	};

	onSuccesModalAction = () => {
		this.setState({ showSuccessModal: false });
		this.props.navigation.popToTop();
		this.props.navigation.goBack(null);
	};

	onCopySeedPhrase = async () => {
		const words = this.props.navigation.getParam('words', []);
		await Clipboard.setString(words.join(' '));
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings(`reveal_credential.seed_phrase_copied`) }
		});
	};

	render() {
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<Pager pages={5} selected={5} />
				<ScrollView
					contentContainerStyle={styles.wrapper}
					style={styles.mainWrapper}
					testID={'account-backup-step-6-screen'}
				>
					<View style={styles.content}>
						<Image
							source={require('../../../images/fox-badge.png')}
							style={styles.foxBadge}
							resizeMethod={'auto'}
						/>
						<Text style={styles.title}>{strings('account_backup_step_6.title')}</Text>
						<View style={styles.text}>
							<Text style={styles.label}>{strings('account_backup_step_6.info_text')}</Text>
						</View>
						<View style={[styles.text, styles.tips]}>
							<View style={styles.bulletPoint}>
								<Text style={styles.bullet}>{'\u2022'}</Text>
								<Text style={styles.label}>{strings('account_backup_step_6.tip_1')}</Text>
							</View>
							<View style={styles.bulletPoint}>
								<Text style={styles.bullet}>{'\u2022'}</Text>
								<Text style={styles.label}>{strings('account_backup_step_6.tip_2')}</Text>
							</View>
							<TouchableOpacity style={styles.copy} onPress={this.onCopySeedPhrase}>
								<Text style={[styles.label, { color: colors.blue }]}>
									{strings('account_backup_step_6.copy_seed_phrase')}
								</Text>
							</TouchableOpacity>
							<View style={styles.bulletPoint}>
								<Text style={styles.bullet}>{'\u2022'}</Text>
								<Text style={styles.label}>{strings('account_backup_step_6.tip_3')}</Text>
							</View>
						</View>

						<View style={[styles.text, styles.disclaimer]}>
							<Text style={styles.label}>
								{strings('account_backup_step_6.disclaimer')}
								<Text style={styles.singleBold}>
									{strings('account_backup_step_6.disclaimer_bold')}
								</Text>
							</Text>
						</View>
					</View>
					<View style={styles.buttonWrapper}>
						<StyledButton
							containerStyle={styles.button}
							type={'confirm'}
							onPress={this.showModal}
							testID={'submit-button'}
						>
							{strings('account_backup_step_6.cta_text')}
						</StyledButton>
					</View>
					<CustomAlert
						headerStyle={{ backgroundColor: colors.grey200 }}
						headerContent={<Emoji name="tada" style={styles.emoji} />}
						titleText={strings('account_backup_step_6.modal_title')}
						buttonText={strings('account_backup_step_6.modal_button')}
						onPress={this.onSuccesModalAction}
						isVisible={this.state.showSuccessModal}
					>
						<Text style={styles.succesModalText}>{strings('account_backup_step_6.modal_text')}</Text>
					</CustomAlert>
				</ScrollView>
				{Device.isAndroid() && <AndroidBackHandler customBackPress={this.props.navigation.pop} />}
			</SafeAreaView>
		);
	}
}

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	null,
	mapDispatchToProps
)(AccountBackupStep6);
