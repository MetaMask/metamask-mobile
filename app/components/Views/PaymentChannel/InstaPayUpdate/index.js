import React, { PureComponent } from 'react';
import { SafeAreaView, Text, View, StyleSheet, Platform } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import PropTypes from 'prop-types';
import StyledButton from '../../../UI/StyledButton';
import DeviceSize from '../../../../util/DeviceSize';
import { strings } from '../../../../../locales/i18n';

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.white,
		paddingBottom: DeviceSize.isIphoneX() ? 32 : 8
	},
	content: {
		flex: 1,
		marginHorizontal: 25,
		marginVertical: DeviceSize.isIphoneX() ? 10 : 0
	},
	text: {
		...fontStyles.normal,
		fontSize: 16,
		lineHeight: 24,
		color: colors.fontPrimary,
		textAlign: 'center'
	},
	text2: {
		marginTop: 30
	},
	title: {
		fontSize: 24,
		...fontStyles.bold,
		color: colors.fontPrimary,
		textAlign: 'center',
		marginBottom: 20
	},
	button: {
		flexDirection: 'row',
		alignSelf: 'center',
		width: '100%',
		marginBottom: 15
	},
	noBorderButton: {
		borderWidth: 0
	},
	noBoldButtonText: {
		...fontStyles.normal
	},
	buttonWrapper: {
		margin: 30,
		marginBottom: 15
	},
	spacer: {
		marginTop: Platform.OS === 'ios' ? 24 : 14,
		height: 50
	},
	link: {
		color: colors.blue
	}
});

/**
 * View shows the migrate screen for InstaPay v2
 */
export default class InstaPayUpdate extends PureComponent {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	transfer = () => {
		this.props.navigation.navigate('InstaPayMigrating');
	};

	withdraw = () => {
		this.props.navigation.navigate('InstaPayWithdrawing');
	};

	learnMore = () => {
		this.props.navigation.navigate('Webview', {
			url: 'https://medium.com/connext/connext-v2-0-is-on-mainnet-b818864d3687',
			title: 'Connext v2'
		});
	};

	render() {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.content}>
					<View style={styles.spacer} />
					<Text style={styles.title}>{strings('payment_channel.update.title')}</Text>
					<Text style={styles.text}>{strings('payment_channel.update.desc_1')}</Text>
					<Text style={[styles.text, styles.text2]}>{strings('payment_channel.update.or')}</Text>
					<Text style={[styles.text, styles.text2]}>
						{strings('payment_channel.update.desc_2')}{' '}
						<Text style={styles.link} onPress={this.learnMore}>
							{strings('payment_channel.update.learn_more')}
						</Text>
					</Text>
				</View>
				<View style={styles.buttonWrapper}>
					<StyledButton type={'confirm'} onPress={this.transfer} containerStyle={styles.button}>
						{strings('payment_channel.update.transfer')}
					</StyledButton>
					<StyledButton
						type={'normal'}
						onPress={this.withdraw}
						containerStyle={[styles.button, styles.noBorderButton]}
						style={styles.noBoldButtonText}
					>
						{strings('payment_channel.update.withdraw')}
					</StyledButton>
				</View>
			</SafeAreaView>
		);
	}
}
