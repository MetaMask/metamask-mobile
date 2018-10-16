import React, { Component } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, Picker } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import I18n, { strings, setLocale, getLanguages } from '../../../locales/i18n';
import StyledButton from '../StyledButton';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		paddingLeft: 20,
		paddingRight: 20
	},
	text: {
		fontSize: 18,
		textAlign: 'left',
		marginBottom: 5,
		...fontStyles.normal
	},
	setting: {
		marginTop: 10,
		marginBottom: 10
	},
	input: {
		borderWidth: 2,
		borderRadius: 5,
		borderColor: colors.concrete
	}
});

/**
 * View that contains app settings
 */
class AppSettings extends Component {
	static navigationOptions = {
		title: strings('app_settings.title'),
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	};

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object
	};

	componentDidMount = () => {
		this.setState({ languages: getLanguages() });
	};

	state = {
		languages: {},
		currentLanguage: I18n.language
	};

	static propTypes = {};

	selectLanguage = language => {
		setLocale(language);
		this.setState({ currentLanguage: language });
	};

	goToRevealPrivateCredential = () => {
		this.props.navigation.navigate('RevealPrivateCredential', { privateCredentialName: 'seed_phrase' });
	};

	render() {
		return (
			<ScrollView style={styles.wrapper} testID={'app-settings-screen'}>
				<View style={styles.setting}>
					<Text style={styles.text}>{strings('app_settings.current_conversion')}</Text>
					<View style={styles.input}>
						<Picker style={styles.picker} />
					</View>
				</View>
				<View style={styles.setting}>
					<Text style={styles.text}>{strings('app_settings.current_language')}</Text>
					<View style={styles.input}>
						<Picker selectedValue={this.state.currentLanguage} onValueChange={this.selectLanguage}>
							{Object.keys(this.state.languages).map(key => (
								<Picker.Item value={key} label={this.state.languages[key]} key={key} />
							))}
						</Picker>
					</View>
				</View>
				<View style={styles.setting}>
					<Text style={styles.text}>{strings('app_settings.new_RPC_URL')}</Text>
					<TextInput style={styles.input} />
				</View>
				<View style={styles.setting}>
					<Text style={styles.text}>{strings('app_settings.state_logs')}</Text>
					<StyledButton type="normal">{strings('app_settings.state_logs_button')}</StyledButton>
				</View>
				<View style={styles.setting}>
					<Text style={styles.text}>{strings('app_settings.reveal_seed_words')}</Text>
					<StyledButton type="warning" onPress={this.goToRevealPrivateCredential}>
						{strings('app_settings.reveal_seed_words_button')}
					</StyledButton>
				</View>
				<View style={styles.setting}>
					<Text style={styles.text}>{strings('app_settings.reset_account')}</Text>
					<StyledButton type="orange">{strings('app_settings.reset_account_button')}</StyledButton>
				</View>
			</ScrollView>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(AppSettings);
