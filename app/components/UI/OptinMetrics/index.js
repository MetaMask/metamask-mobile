import React, { Component } from 'react';
import { View, SafeAreaView, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { baseStyles, fontStyles, colors } from '../../../styles/common';
import ActionView from '../../UI/ActionView';
import AsyncStorage from '@react-native-community/async-storage';
import AntIcon from 'react-native-vector-icons/AntDesign';
import { getOptinMetricsNavbarOptions } from '../Navbar';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { strings } from '../../../../locales/i18n';
import setOnboardingWizardStep from '../../../actions/wizard';
import { connect } from 'react-redux';
import { NavigationActions } from 'react-navigation';

const styles = StyleSheet.create({
	root: {
		...baseStyles.flexGrow
	},
	checkIcon: {
		color: colors.green500
	},
	crossIcon: {
		color: colors.red
	},
	icon: {
		marginRight: 5
	},
	action: {
		flex: 0,
		flexDirection: 'row',
		paddingVertical: 10,
		alignItems: 'center'
	},
	title: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 22
	},
	description: {
		...fontStyles.normal,
		color: colors.black,
		flex: 1
	},
	content: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.black,
		paddingVertical: 10
	},
	wrapper: {
		marginHorizontal: 20
	},
	privacyPolicy: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.grey400
	},
	link: {
		textDecorationLine: 'underline'
	}
});

const PRIVACY_POLICY = 'https://metamask.io/privacy.html';
/**
 * View that is displayed in the flow to agree to metrics
 */
class OptinMetrics extends Component {
	static navigationOptions = () => getOptinMetricsNavbarOptions();

	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object,
		/**
		 * Action to set onboarding wizard step
		 */
		setOnboardingWizardStep: PropTypes.func
	};

	actionsList = [
		{
			action: 0,
			description: strings('privacy_policy.action_description_1')
		},
		{
			action: 0,
			description: strings('privacy_policy.action_description_2')
		},
		{
			action: 0,
			description: strings('privacy_policy.action_description_3')
		},
		{
			action: 1,
			description: strings('privacy_policy.action_description_4')
		},
		{
			action: 1,
			description: strings('privacy_policy.action_description_5')
		},
		{
			action: 1,
			description: strings('privacy_policy.action_description_6')
		}
	];

	continue = async () => {
		// Get onboarding wizard state
		const onboardingWizard = await AsyncStorage.getItem('@MetaMask:onboardingWizard');
		if (onboardingWizard) {
			this.props.navigation.navigate('HomeNav');
		} else {
			this.props.setOnboardingWizardStep(1);
			this.props.navigation.navigate('HomeNav', {}, NavigationActions.navigate({ routeName: 'WalletView' }));
		}
	};

	renderAction = ({ action, description }, i) => (
		<View style={styles.action} key={i}>
			{action === 0 ? (
				<AntIcon name="check" size={24} style={[styles.icon, styles.checkIcon]} />
			) : (
				<AntIcon name="close" size={24} style={[styles.icon, styles.crossIcon]} />
			)}
			<Text style={styles.description}>{description}</Text>
		</View>
	);

	onCancel = async () => {
		await AsyncStorage.setItem('@MetaMask:metricsOptIn', 'denied');
		this.continue();
	};

	onConfirm = async () => {
		await AsyncStorage.setItem('@MetaMask:metricsOptIn', 'agreed');
		this.continue();
	};

	pressPolicy = () => {
		const { navigation } = this.props;
		navigation.navigate('Webview', {
			url: PRIVACY_POLICY,
			title: strings('privacy_policy.title')
		});
	};

	renderPrivacyPolicy = () => (
		<TouchableOpacity onPress={this.pressPolicy}>
			<Text style={styles.privacyPolicy}>
				{strings('privacy_policy.description') + ' '}
				<Text style={styles.link}>{strings('privacy_policy.here')}</Text>
				{strings('unit.point')}
			</Text>
		</TouchableOpacity>
	);

	render() {
		return (
			<SafeAreaView style={styles.root}>
				<ActionView
					cancelText={strings('privacy_policy.decline')}
					confirmText={strings('privacy_policy.agree')}
					onCancelPress={this.onCancel}
					onConfirmPress={this.onConfirm}
					confirmButtonMode={'confirm'}
					stickyView={this.renderPrivacyPolicy()}
				>
					<View style={styles.wrapper}>
						<Text style={styles.title}>{strings('privacy_policy.description_title')}</Text>
						<Text style={styles.content}>{strings('privacy_policy.description_content_1')}</Text>
						<Text style={styles.content}>{strings('privacy_policy.description_content_2')}</Text>

						{this.actionsList.map((action, i) => this.renderAction(action, i))}
					</View>
				</ActionView>
			</SafeAreaView>
		);
	}
}

const mapDispatchToProps = dispatch => ({
	setOnboardingWizardStep: step => dispatch(setOnboardingWizardStep(step))
});

export default connect(
	null,
	mapDispatchToProps
)(OptinMetrics);
