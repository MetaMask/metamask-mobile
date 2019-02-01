import React, { Component } from 'react';
import { Alert, Text, TouchableOpacity, View, SafeAreaView, StyleSheet } from 'react-native';

import PropTypes from 'prop-types';
import Pager from '../Pager';
import { colors, fontStyles } from '../../styles/common';
import StyledButton from '../StyledButton';

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
		width: 95,
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
			'Cancel Backup',
			'We highly recommend you save your seed phrase in order to restore your wallet.',
			[
				{
					text: 'Cancel',
					onPress: () => null,
					style: 'cancel'
				},
				{
					text: 'OK',
					onPress: () => {
						this.props.navigation.popToTop();
						this.props.navigation.goBack(null);
					}
				}
			],
			{ cancelable: false }
		);
	};

	goNext = () => {
		this.props.navigation.navigate('AccountBackupStep5');
	};

	render() {
		const words = 'Apple Brace Brick House Chase Internet Bananas Woman Phrase Sharing World Hair'.split(' ');

		return (
			<SafeAreaView style={styles.mainWrapper}>
				<Pager pages={5} selected={3} />
				<TouchableOpacity onPress={this.dismiss} style={styles.navbarLeftButton}>
					<Text style={styles.navbarLeftText}>Back</Text>
				</TouchableOpacity>
				<View style={styles.wrapper} testID={'protect-your-account-screen'}>
					<View style={styles.content}>
						<Text style={styles.title}>Your seed phrase</Text>
						<View style={styles.text}>
							<Text style={styles.label}>
								Carefully write down these words on paper. Their order matters.
							</Text>
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
							<Text style={styles.label}>{`You'll be asked to re-enter it on the next screen`}</Text>
						</View>
					</View>
					<View style={styles.buttonWrapper}>
						<StyledButton
							containerStyle={styles.button}
							type={'confirm'}
							onPress={this.goNext}
							testID={'create-password-button'}
						>
							{`I'VE WRITTEN IT DOWN`}
						</StyledButton>
					</View>
				</View>
			</SafeAreaView>
		);
	}
}
