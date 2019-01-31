import React, { Component } from 'react';
import { Alert, Text, TouchableOpacity, View, SafeAreaView, StyleSheet } from 'react-native';

import PropTypes from 'prop-types';
import Emoji from 'react-native-emoji';
import Icon from 'react-native-vector-icons/MaterialIcons';
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
		color: colors.fontPrimary,
		textAlign: 'left',
		...fontStyles.normal
	},
	subtitle: {
		marginBottom: 5
	},
	emoji: {
		textAlign: 'left',
		fontSize: 75,
		marginTop: 10
	},
	buttonWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	},
	warning: {
		marginBottom: 20
	},
	warningText: {
		lineHeight: 22,
		color: colors.darkRed
	},
	bullet: {
		marginRight: 5
	},
	bulletPoint: {
		flexDirection: 'row',
		marginBottom: 15
	},
	navbarRightButton: {
		alignSelf: 'flex-end',
		paddingHorizontal: 22,
		paddingTop: 20,
		paddingBottom: 10
	},
	closeIcon: {
		fontSize: 28,
		color: colors.fontSecondary
	}
});

/**
 * Component that provides ability to render transaction submitted view
 */
export default class AccountBackupStep2 extends Component {
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
		this.props.navigation.navigate('AccountBackupStep3');
	};

	render() {
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<Pager pages={5} selected={1} />
				<TouchableOpacity onPress={this.dismiss} style={styles.navbarRightButton}>
					<Icon name="close" size={15} style={styles.closeIcon} />
				</TouchableOpacity>
				<View style={styles.wrapper} testID={'protect-your-account-screen'}>
					<View style={styles.content}>
						<Emoji name="writing_hand" style={styles.emoji} />
						<Text style={styles.title}>Grab a pen and paper</Text>
						<View style={styles.warning}>
							<Text style={[styles.label, styles.warningText]}>
								{`You're going to need to write your seed phrase down. You will be asked to re-enter it in the other it's presented to you.`}
							</Text>
						</View>
						<View style={styles.text}>
							<Text style={[styles.label, styles.subtitle]}>Security Tips</Text>
						</View>
						<View style={styles.text}>
							<View style={styles.bulletPoint}>
								<Text style={styles.bullet}>{'\u2022'}</Text>
								<Text style={styles.label}>Write it down on paper and keep it somewhere safe!</Text>
							</View>
							<View style={styles.bulletPoint}>
								<Text style={styles.bullet}>{'\u2022'}</Text>
								<Text style={styles.label}>Save it to a password manager</Text>
							</View>
							<View style={styles.bulletPoint}>
								<Text style={styles.bullet}>{'\u2022'}</Text>
								<Text style={styles.label}>Never share this phrase with anyone!</Text>
							</View>
						</View>
					</View>
					<View style={styles.buttonWrapper}>
						<StyledButton
							containerStyle={styles.button}
							type={'confirm'}
							onPress={this.goNext}
							testID={'create-password-button'}
						>
							OK
						</StyledButton>
					</View>
				</View>
			</SafeAreaView>
		);
	}
}
