import React, { PureComponent } from 'react';
import { ScrollView, Text, View, SafeAreaView, StyleSheet } from 'react-native';

import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import Emoji from 'react-native-emoji';
import { strings } from '../../../../locales/i18n';
import AndroidBackHandler from '../AndroidBackHandler';
import Device from '../../../util/Device';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flexGrow: 1,
		padding: 20
	},
	content: {
		alignItems: 'flex-start'
	},
	title: {
		fontSize: 32,
		marginHorizontal: 10,
		marginTop: 20,
		marginBottom: 20,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'left',
		...fontStyles.normal
	},
	text: {
		marginHorizontal: 10,
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
		fontSize: 72,
		marginTop: 30,
		marginHorizontal: 10
	},
	buttonWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	},
	step: {
		marginBottom: 20,
		fontSize: 23,
		...fontStyles.bold
	}
});

/**
 * View that is displayed in the flow after detecting that
 * the user received funds for the first time
 */
export default class ProtectYourAccount extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};

	goNext = () => {
		this.props.navigation.navigate('ChoosePassword', {
			from: 'protect'
		});
	};

	render() {
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<ScrollView
					contentContainerStyle={styles.wrapper}
					style={styles.mainWrapper}
					testID={'protect-your-account-screen'}
				>
					<View style={styles.content}>
						<Emoji name="closed_lock_with_key" style={styles.emoji} />
						<Text style={styles.title}>{strings('secure_your_wallet.title')}</Text>
						<View style={styles.text}>
							<Text style={styles.label}>{strings('secure_your_wallet.step_1')}</Text>
						</View>
						<View style={styles.text}>
							<Text style={[styles.label, styles.step]}>
								{strings('secure_your_wallet.step_1_description')}
							</Text>
						</View>
						<View style={styles.text}>
							<Text style={styles.label}>{strings('secure_your_wallet.step_2')}</Text>
						</View>
						<View style={styles.text}>
							<Text style={[styles.label, styles.step]}>
								{strings('secure_your_wallet.step_2_description')}
							</Text>
						</View>
						<View style={styles.text}>
							<Text style={styles.label}>{strings('secure_your_wallet.info_text_1')}</Text>
						</View>
						<View style={styles.text}>
							<Text style={styles.label}>{strings('secure_your_wallet.info_text_2')}</Text>
						</View>
					</View>
					<View style={styles.buttonWrapper}>
						<StyledButton
							containerStyle={styles.button}
							type={'confirm'}
							onPress={this.goNext}
							testID={'submit-button'}
						>
							{strings('secure_your_wallet.cta_text')}
						</StyledButton>
					</View>
				</ScrollView>
				{Device.isAndroid() && <AndroidBackHandler customBackPress={this.props.navigation.pop} />}
			</SafeAreaView>
		);
	}
}
