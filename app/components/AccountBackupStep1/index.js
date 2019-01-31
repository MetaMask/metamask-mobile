import React, { Component } from 'react';
import { Alert, TouchableOpacity, Text, View, SafeAreaView, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../styles/common';
import StyledButton from '../StyledButton';
import Button from '../Button';
import Pager from '../Pager';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
		padding: 20
	},
	content: {
		alignItems: 'flex-start'
	},
	title: {
		width: 260,
		fontSize: 32,
		marginLeft: 20,
		marginTop: 20,
		marginBottom: 20,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'left',
		...fontStyles.normal
	},
	text: {
		marginLeft: 20,
		marginRight: 20,
		marginBottom: 10,
		justifyContent: 'center'
	},
	label: {
		marginBottom: 20,
		lineHeight: 23,
		fontSize: 16,
		color: colors.fontPrimary,
		textAlign: 'left',
		...fontStyles.normal
	},
	buttonWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	},
	learnMoreButton: {
		backgroundColor: colors.transparent,
		flex: 0,
		height: 60
	},
	learnMore: {
		color: colors.primary,
		fontSize: 18
	},
	bold: {
		lineHeight: 25,
		...fontStyles.bold
	},
	recommended: {
		alignSelf: 'center',
		marginBottom: 25,
		paddingHorizontal: 17,
		paddingVertical: 9,
		backgroundColor: colors.yellow,
		borderRadius: 8
	},
	recommendedText: {
		color: colors.fontPrimary,
		fontSize: 12,
		...fontStyles.normal
	},
	navbarRightButton: {
		alignSelf: 'flex-end',
		paddingHorizontal: 28,
		paddingVertical: 20
	},
	navbarRightText: {
		fontSize: 18,
		color: colors.primary,
		...fontStyles.normal
	}
});

/**
 * Component that provides ability to render transaction submitted view
 */
export default class AccountBackupStep1 extends Component {
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};

	goNext = () => {
		this.props.navigation.navigate('AccountBackupStep2');
	};

	dismiss = () => {
		Alert.alert(
			'Cancel Backup',
			'We highly recommend you save your seed phrase in order to restore your wallet.',
			[
				{
					text: `Yes, I'll take the risk`,
					onPress: () => {
						this.props.navigation.popToTop();
						this.props.navigation.goBack(null);
					}
				},
				{
					text: 'NO',
					onPress: () => null,
					style: 'cancel'
				}
			],
			{ cancelable: false }
		);
	};

	learnMore = () => null;

	render() {
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<Pager pages={5} />
				<TouchableOpacity onPress={this.dismiss} style={styles.navbarRightButton}>
					<Text style={styles.navbarRightText}>Skip</Text>
				</TouchableOpacity>
				<View style={styles.wrapper} testID={'protect-your-account-screen'}>
					<View style={styles.content}>
						<Text style={styles.title}>{`Save your wallet's seed phrase?`}</Text>
						<View style={styles.recommended}>
							<Text style={styles.recommendedText}>HIGHLY RECOMMENDED</Text>
						</View>
						<View style={styles.text}>
							<Text style={styles.label}>
								The seed phrase is a unique twelve word phrase used to recover your wallet should you
								ever loose your device.
							</Text>
							<Text style={styles.label}>
								Do not share this with anyone! It’s crucial to save this phrase in a secure place only
								you have access to.
							</Text>
							<Text style={styles.bold}>IMPORTANT!</Text>
							<Text style={styles.label}>
								Your password cannot be used to recover your wallet! Only the seed phrase can be used to
								recover your wallet and all of it’s funds!
							</Text>
						</View>
					</View>
					<View style={styles.buttonWrapper}>
						<StyledButton
							containerStyle={styles.button}
							type={'confirm'}
							onPress={this.goNext}
							testID={'create-password-button'}
						>
							{`YEAH, LET'S SAVE IT`}
						</StyledButton>
						<Button
							style={styles.learnMoreButton}
							onPress={this.learnMore}
							testID={'create-password-button'}
						>
							<Text style={styles.learnMore}>{`Learn More`}</Text>
						</Button>
					</View>
				</View>
			</SafeAreaView>
		);
	}
}
