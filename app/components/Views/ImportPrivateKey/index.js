import React, { Component } from 'react';
import { Platform, Alert, ActivityIndicator, TouchableOpacity, TextInput, Text, View, StyleSheet } from 'react-native';

import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import Icon from 'react-native-vector-icons/Feather';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { strings } from '../../../../locales/i18n';
import DeviceSize from '../../../util/DeviceSize';
import Engine from '../../../core/Engine';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.lightBlue,
		flex: 1
	},
	wrapper: {
		flex: Platform.OS === 'android' ? 0 : 1
	},
	content: {
		alignItems: 'flex-start'
	},
	title: {
		fontSize: 32,
		marginTop: 20,
		marginBottom: 40,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'left',
		...fontStyles.normal
	},
	dataRow: {
		marginBottom: 10
	},
	label: {
		fontSize: 14,
		color: colors.fontPrimary,
		textAlign: 'left',
		...fontStyles.normal
	},
	subtitleText: {
		fontSize: 18,
		...fontStyles.bold
	},
	icon: {
		textAlign: 'left',
		fontSize: 50,
		marginTop: 0,
		marginLeft: 0
	},
	buttonWrapper: {
		flex: 1,
		justifyContent: 'flex-end',
		padding: 20,
		backgroundColor: colors.white
	},
	button: {
		marginBottom: DeviceSize.isIphoneX() ? 20 : 0
	},
	top: {
		paddingTop: 0,
		padding: 30
	},
	bottom: {
		width: '100%',
		padding: 30,
		backgroundColor: colors.white
	},
	input: {
		marginTop: 20,
		marginBottom: 10,
		backgroundColor: colors.white,
		paddingTop: 20,
		paddingBottom: 20,
		paddingLeft: 20,
		paddingRight: 20,
		fontSize: 15,
		borderRadius: 4,
		height: 120,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor,
		...fontStyles.normal
	},
	navbarRightButton: {
		alignSelf: 'flex-end',
		paddingHorizontal: 22,
		paddingTop: 20,
		paddingBottom: 10,
		marginTop: DeviceSize.isIphoneX() ? 40 : 20
	},
	closeIcon: {
		fontSize: 28,
		color: colors.fontSecondary
	}
});

/**
 * View that's displayed the first time a user receives funds
 */
export default class ImportPrivateKey extends Component {
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};

	state = {
		privateKey: '',
		loading: false
	};

	goNext = async () => {
		if (this.state.privateKey === '') {
			Alert.alert(strings('import_private_key.error_title'), strings('import_private_key.error_empty_message'));
			this.setState({ loading: false });
			return;
		}

		this.setState({ loading: true });
		// Import private key
		try {
			const { KeyringController } = Engine.context;
			await KeyringController.importAccountWithStrategy('privateKey', [this.state.privateKey]);
			this.props.navigation.navigate('ImportPrivateKeySuccess');
			this.setState({ loading: false, privateKey: '' });
		} catch (e) {
			Alert.alert(strings('import_private_key.error_title'), strings('import_private_key.error_message'));
			this.setState({ loading: false });
		}
	};

	learnMore = () =>
		this.props.navigation.navigate('Webview', {
			url: 'https://metamask.zendesk.com/hc/en-us/articles/360015289932-What-are-imported-accounts-',
			title: strings('drawer.metamask_support')
		});

	onInputChange = value => {
		this.setState({ privateKey: value });
	};

	dismiss = () => {
		this.props.navigation.goBack(null);
	};

	render() {
		return (
			<View style={styles.mainWrapper}>
				<KeyboardAwareScrollView
					contentContainerStyle={styles.wrapper}
					style={styles.mainWrapper}
					testID={'first-incoming-transaction-screen'}
					resetScrollToCoords={{ x: 0, y: 0 }}
				>
					<View style={styles.content}>
						<TouchableOpacity onPress={this.dismiss} style={styles.navbarRightButton}>
							<MaterialIcon name="close" size={15} style={styles.closeIcon} />
						</TouchableOpacity>
						<View style={styles.top}>
							<Icon name="download" style={styles.icon} />
							<Text style={styles.title}>{strings('import_private_key.title')}</Text>
							<View style={styles.dataRow}>
								<Text style={styles.label}>{strings('import_private_key.description_one')}</Text>
							</View>
							<View style={styles.dataRow}>
								<Text style={styles.label} onPress={this.learnMore}>
									{strings('import_private_key.learn_more_here')}
								</Text>
							</View>
						</View>
						<View style={styles.bottom}>
							<View style={styles.subtitleText}>
								<Text style={styles.subtitleText}>{strings('import_private_key.subtitle')}</Text>
							</View>
							<TextInput
								value={this.state.privateKey}
								numberOfLines={3}
								multiline
								style={styles.input}
								onChangeText={this.onInputChange}
								testID={'input-private-key'}
								blurOnSubmit
								onSubmitEditing={this.goNext}
								returnKeyType={'next'}
								placeholder={strings('import_private_key.example')}
							/>
						</View>
					</View>
					<View style={styles.buttonWrapper}>
						<StyledButton
							containerStyle={styles.button}
							type={'confirm'}
							onPress={this.goNext}
							testID={'submit-button'}
						>
							{this.state.loading ? (
								<ActivityIndicator size="small" color="white" />
							) : (
								strings('import_private_key.cta_text')
							)}
						</StyledButton>
					</View>
				</KeyboardAwareScrollView>
			</View>
		);
	}
}
