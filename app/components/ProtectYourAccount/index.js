import React, { Component } from 'react';
import { Text, View, SafeAreaView, StyleSheet } from 'react-native';

import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../styles/common';
import StyledButton from '../StyledButton';
import Emoji from 'react-native-emoji';

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
		width: 200,
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
		marginBottom: 10,
		justifyContent: 'center'
	},
	label: {
		fontSize: 16,
		color: colors.fontPrimary,
		textAlign: 'left',
		...fontStyles.normal
	},
	emoji: {
		textAlign: 'left',
		fontSize: 72,
		marginTop: 30,
		marginLeft: 20
	},
	buttonWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	}
});

/**
 * Component that provides ability to render transaction submitted view
 */
export default class ProtectYourAccount extends Component {
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};

	goNext = () => {
		this.props.navigation.navigate('ChoosePassword');
	};

	render() {
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<View style={styles.wrapper} testID={'protect-your-account-screen'}>
					<View style={styles.content}>
						<Emoji name="closed_lock_with_key" style={styles.emoji} />
						<Text style={styles.title}>Protect your Account</Text>
						<View style={styles.text}>
							<Text
								style={styles.label}
							>{`Now that your account has stored value, let's create a password in order to protect your account.`}</Text>
						</View>
					</View>
					<View style={styles.buttonWrapper}>
						<StyledButton
							containerStyle={styles.button}
							type={'confirm'}
							onPress={this.goNext}
							testID={'create-password-button'}
						>
							CREATE PASSWORD
						</StyledButton>
					</View>
				</View>
			</SafeAreaView>
		);
	}
}
