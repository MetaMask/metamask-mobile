import React, { Component } from 'react';
import { ScrollView, Text, TouchableOpacity, View, SafeAreaView, StyleSheet } from 'react-native';

import PropTypes from 'prop-types';
import Emoji from 'react-native-emoji';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Pager from '../../UI/Pager';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
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
		fontSize: 75,
		marginTop: 40
	},
	buttonWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	},
	bold: {
		marginTop: 20,
		marginBottom: 20,
		...fontStyles.bold
	},
	bullet: {
		marginRight: 5
	},
	bulletPoint: {
		flexDirection: 'row',
		marginBottom: 5
	},
	link: {
		flexDirection: 'row'
	},
	dot: {
		color: colors.fontPrimary,
		fontSize: 16,
		lineHeight: 23,
		textAlign: 'left',
		...fontStyles.normal
	},
	linkText: {
		color: colors.primary,
		fontSize: 16,
		lineHeight: 23,
		textAlign: 'left',
		...fontStyles.normal
	},
	buttonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},
	successIcon: {
		color: colors.white,
		fontSize: 20,
		marginRight: 10
	},
	buttonText: {
		fontSize: 18,
		textAlign: 'center',
		color: colors.white,
		...fontStyles.bold
	}
});

/**
 * View that's shown during the last step of
 * the backup seed phrase flow
 */
export default class AccountBackupStep6 extends Component {
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};

	dismiss = () => {
		this.props.navigation.popToTop();
		this.props.navigation.goBack(null);
	};

	learnMore = () =>
		this.props.navigation.navigate('Webview', {
			url: 'https://support.metamask.io',
			title: strings('drawer.metamask_support')
		});

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
						<Emoji name="tada" style={styles.emoji} />
						<Text style={styles.title}>{strings('account_backup_step_6.title')}</Text>
						<View style={styles.text}>
							<Text style={styles.label}>{strings('account_backup_step_6.info_text')}</Text>
						</View>
						<View style={styles.text}>
							<Text style={[styles.label, styles.bold]}>{strings('account_backup_step_6.tips')}</Text>
						</View>
						<View style={styles.text}>
							<View style={styles.bulletPoint}>
								<Text style={styles.bullet}>{'\u2022'}</Text>
								<Text style={styles.label}>{strings('account_backup_step_6.tip_1')}</Text>
							</View>
							<View style={styles.bulletPoint}>
								<Text style={styles.bullet}>{'\u2022'}</Text>
								<Text style={styles.label}>{strings('account_backup_step_6.tip_2')}</Text>
							</View>
						</View>
						<View style={styles.text}>
							<Text style={styles.label}>{strings('account_backup_step_6.tip_3')}</Text>
						</View>
						<View style={styles.text}>
							<Text style={styles.label}>{strings('account_backup_step_6.disclaimer')}</Text>
							<TouchableOpacity style={styles.link} onPress={this.learnMore}>
								<Text style={styles.linkText}>{strings('account_backup_step_6.learn_more')}</Text>
								<Text style={styles.dot}>.</Text>
							</TouchableOpacity>
						</View>
					</View>
					<View style={styles.buttonWrapper}>
						<StyledButton
							containerStyle={styles.button}
							type={'confirm'}
							onPress={this.dismiss}
							testID={'submit-button'}
						>
							<View style={styles.buttonContent}>
								<Icon name="check" size={15} style={styles.successIcon} />
								<Text style={styles.buttonText}>{strings('account_backup_step_6.cta_text')}</Text>
							</View>
						</StyledButton>
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	}
}
