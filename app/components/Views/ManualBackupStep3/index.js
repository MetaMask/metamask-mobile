import React, { PureComponent } from 'react';
import { ScrollView, Text, View, SafeAreaView, StyleSheet, TouchableOpacity } from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import Emoji from 'react-native-emoji';
import OnboardingProgress from '../../UI/OnboardingProgress';
import StyledButton from '../../UI/StyledButton';
import { strings } from '../../../../locales/i18n';
import { showAlert } from '../../../actions/alert';
import AndroidBackHandler from '../AndroidBackHandler';
import Device from '../../../util/Device';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	scrollviewWrapper: {
		flex: 1,
		paddingTop: 12
	},
	wrapper: {
		flex: 1,
		paddingHorizontal: 50
	},
	onBoardingWrapper: {
		paddingHorizontal: 20,
		marginBottom: 12
	},
	congratulations: {
		fontSize: 32,
		marginBottom: 12,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.extraBold
	},
	baseText: {
		fontSize: 16,
		color: colors.fontPrimary,
		textAlign: 'center',
		...fontStyles.normal
	},
	successText: {
		marginBottom: 32
	},
	hintText: {
		marginBottom: 26,
		color: colors.blue
	},
	learnText: {
		color: colors.blue
	},
	recoverText: {
		marginBottom: 26
	},
	emoji: {
		textAlign: 'center',
		fontSize: 65,
		marginBottom: 16
	},
	buttonWrapper: {
		flexShrink: 1,
		justifyContent: 'flex-end',
		paddingHorizontal: 32
	}
});

/**
 * View that's shown during the last step of
 * the backup seed phrase flow
 */
class ManualBackupStep3 extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};

	state = {
		currentStep: 4,
		showHint: false
	};

	componentDidMount() {
		this.steps = this.props.navigation.getParam('steps');
	}

	toggleHint = () => {
		this.setState({ showHint: !this.state.showHint });
	};

	learnMore = () =>
		this.props.navigation.navigate('Webview', {
			url: 'https://support.metamask.io',
			title: strings('drawer.metamask_support')
		});

	render() {
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<ScrollView
					contentContainerStyle={styles.scrollviewWrapper}
					style={styles.mainWrapper}
					testID={'account-backup-step-6-screen'}
				>
					<View style={styles.onBoardingWrapper}>
						<OnboardingProgress currentStep={this.state.currentStep} stepWords={this.steps} />
					</View>
					<View style={styles.wrapper}>
						<Emoji name="tada" style={styles.emoji} />
						<Text style={styles.congratulations}>{strings('manual_backup_step_3.congratulations')}</Text>
						<Text style={[styles.baseText, styles.successText]}>
							{strings('manual_backup_step_3.success')}
						</Text>
						<TouchableOpacity>
							<Text style={[styles.baseText, styles.hintText]}>
								{strings('manual_backup_step_3.hint')}
							</Text>
						</TouchableOpacity>
						<Text style={[styles.baseText, styles.recoverText]}>
							{strings('manual_backup_step_3.recover')}
						</Text>
						<TouchableOpacity onPress={this.learnMore}>
							<Text style={[styles.baseText, styles.learnText]}>
								{strings('manual_backup_step_3.learn')}
							</Text>
						</TouchableOpacity>
					</View>
				</ScrollView>
				<View style={styles.buttonWrapper}>
					<StyledButton containerStyle={styles.button} type={'confirm'} testID={'submit-button'}>
						{strings('manual_backup_step_3.done')}
					</StyledButton>
				</View>
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
)(ManualBackupStep3);
