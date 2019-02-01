import React, { Component } from 'react';
import { Text, TouchableOpacity, View, SafeAreaView, StyleSheet } from 'react-native';

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
	closeIcon: {
		color: colors.white,
		fontSize: 20
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
	button: {
		flexDirection: 'row'
	}
});

/**
 * Component that provides ability to render transaction submitted view
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

	learnMore = () => null;

	render() {
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<Pager pages={5} selected={5} />
				<View style={styles.wrapper} testID={'protect-your-account-screen'}>
					<View style={styles.content}>
						<Emoji name="tada" style={styles.emoji} />
						<Text style={styles.title}>Congratulations!</Text>
						<View style={styles.text}>
							<Text style={styles.label}>
								{`You passed the test. Keep your seed phrase safe, it's your responsibility!`}
							</Text>
						</View>
						<View style={styles.text}>
							<Text style={[styles.label, styles.bold]}>Tips on storing it safely</Text>
						</View>
						<View style={styles.text}>
							<View style={styles.bulletPoint}>
								<Text style={styles.bullet}>{'\u2022'}</Text>
								<Text style={styles.label}>Save a backup in multiple places</Text>
							</View>
							<View style={styles.bulletPoint}>
								<Text style={styles.bullet}>{'\u2022'}</Text>
								<Text style={styles.label}>Never tell anyone</Text>
							</View>
						</View>
						<View style={styles.text}>
							<Text style={styles.label}>
								{`If you need to back it up again, you can find them in Settings => Security.`}
							</Text>
						</View>
						<View style={styles.text}>
							<Text style={styles.label}>{`*MetaMask cannot recover your seedphrase`}</Text>
							<TouchableOpacity style={styles.link} onPress={this.learnMore}>
								<Text style={styles.linkText}>{`Learn More`}</Text>
								<Text style={styles.dot}>.</Text>
							</TouchableOpacity>
						</View>
					</View>
					<View style={styles.buttonWrapper}>
						<StyledButton
							containerStyle={styles.button}
							type={'confirm'}
							onPress={this.dismiss}
							testID={'create-password-button'}
						>
							<Icon name="check" size={15} style={styles.closeIcon} />
							{`ALL DONE`}
						</StyledButton>
					</View>
				</View>
			</SafeAreaView>
		);
	}
}
