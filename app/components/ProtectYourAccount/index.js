import React, { Component } from 'react';
import { ScrollView, Text, View, SafeAreaView, StyleSheet } from 'react-native';

import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../styles/common';
import StyledButton from '../StyledButton';
import Emoji from 'react-native-emoji';
import { strings } from '../../../locales/i18n';

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
		lineHeight: 23,
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
 * View that is displayed in the flow after detecting that
 * the user received funds for the first time
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
				<ScrollView
					contentContainerStyle={styles.wrapper}
					style={styles.mainWrapper}
					testID={'protect-your-account-screen'}
				>
					<View style={styles.content}>
						<Emoji name="closed_lock_with_key" style={styles.emoji} />
						<Text style={styles.title}>{strings('protect_your_account.title')}</Text>
						<View style={styles.text}>
							<Text style={styles.label}>{strings('protect_your_account.info_text')}</Text>
						</View>
					</View>
					<View style={styles.buttonWrapper}>
						<StyledButton
							containerStyle={styles.button}
							type={'confirm'}
							onPress={this.goNext}
							testID={'submit-button'}
						>
							{strings('protect_your_account.cta_text')}
						</StyledButton>
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	}
}
