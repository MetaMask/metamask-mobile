import React, { Component } from 'react';
import { ScrollView, Alert, Text, TouchableOpacity, View, SafeAreaView, StyleSheet } from 'react-native';

import PropTypes from 'prop-types';
import Pager from '../Pager';
import { colors, fontStyles } from '../../styles/common';
import StyledButton from '../StyledButton';
import { strings } from '../../../locales/i18n';

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
	buttonWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	},
	navbarLeftButton: {
		alignSelf: 'flex-start',
		paddingHorizontal: 22,
		paddingTop: 20,
		paddingBottom: 10
	},
	navbarLeftText: {
		fontSize: 18,
		color: colors.primary,
		...fontStyles.normal
	},
	seedPhraseWrapper: {
		backgroundColor: colors.lighterGray,
		borderRadius: 10,
		marginBottom: 22,
		flexDirection: 'row',
		borderColor: colors.borderColor,
		borderWidth: 1
	},
	colLeft: {
		paddingVertical: 20,
		flex: 1,
		alignItems: 'center',
		borderColor: colors.borderColor,
		borderRightWidth: 1
	},
	colRight: {
		paddingVertical: 20,
		flex: 1,
		alignItems: 'center'
	},
	word: {
		paddingHorizontal: 8,
		paddingTop: 6,
		paddingBottom: 4,
		width: 105,
		fontSize: 14,
		lineHeight: 14,
		backgroundColor: colors.white,
		borderColor: colors.borderColor,
		borderWidth: 1,
		marginBottom: 15,
		borderRadius: 4
	}
});

/**
 * Component that provides ability to render transaction submitted view
 */
export default class AccountBackupStep4 extends Component {
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};

	dismiss = () => {
		Alert.alert(
			strings('account_backup_step_4.cancel_backup_title'),
			strings('account_backup_step_4.cancel_backup_message'),
			[
				{
					text: strings('account_backup_step_4.cancel_backup_ok'),
					onPress: () => {
						this.props.navigation.popToTop();
						this.props.navigation.goBack(null);
					}
				},
				{
					text: strings('account_backup_step_4.cancel_backup_no'),
					onPress: () => null,
					style: 'cancel'
				}
			],
			{ cancelable: false }
		);
	};

	goNext = () => {
		this.props.navigation.navigate('AccountBackupStep5', { words: this.props.navigation.getParam('words', []) });
	};

	render() {
		const words = this.props.navigation.getParam('words', []);

		return (
			<SafeAreaView style={styles.mainWrapper}>
				<Pager pages={5} selected={3} />
				<ScrollView
					contentContainerStyle={styles.scrollviewWrapper}
					style={styles.mainWrapper}
					testID={'account-backup-step-4-screen'}
				>
					<TouchableOpacity onPress={this.dismiss} style={styles.navbarLeftButton}>
						<Text style={styles.navbarLeftText}>{strings('account_backup_step_4.back')}</Text>
					</TouchableOpacity>
					<View style={styles.wrapper} testID={'protect-your-account-screen'}>
						<View style={styles.content}>
							<Text style={styles.title}>{strings('account_backup_step_4.title')}</Text>
							<View style={styles.text}>
								<Text style={styles.label}>{strings('account_backup_step_4.info_text_1')}</Text>
							</View>

							<View style={styles.seedPhraseWrapper}>
								<View style={styles.colLeft}>
									{words.slice(0, 6).map((word, i) => (
										<Text key={`word_${i}`} style={styles.word}>
											{`${i + 1}. ${word}`}
										</Text>
									))}
								</View>
								<View style={styles.colRight}>
									{words.slice(-6).map((word, i) => (
										<Text key={`word_${i}`} style={styles.word}>
											{`${i + 7}. ${word}`}
										</Text>
									))}
								</View>
							</View>

							<View style={styles.text}>
								<Text style={styles.label}>{strings('account_backup_step_4.info_text_1')}</Text>
							</View>
						</View>
						<View style={styles.buttonWrapper}>
							<StyledButton
								containerStyle={styles.button}
								type={'confirm'}
								onPress={this.goNext}
								testID={'submit-button'}
							>
								{strings('account_backup_step_4.cta_text')}
							</StyledButton>
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	}
}
