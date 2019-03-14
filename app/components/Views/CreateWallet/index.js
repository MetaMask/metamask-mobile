import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
	Platform,
	Image,
	ActivityIndicator,
	InteractionManager,
	Text,
	View,
	ScrollView,
	StyleSheet
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import { colors, fontStyles } from '../../../styles/common';
import AnimatedFox from 'react-native-animated-fox';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import SecureKeychain from '../../../core/SecureKeychain';
import { passwordUnset, seedphraseNotBackedUp } from '../../../actions/user';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	flex: {
		flex: 1
	},
	wrapper: {
		paddingTop: 10,
		paddingHorizontal: 40,
		paddingBottom: 30,
		flex: 1
	},
	content: {
		flex: 1,
		alignItems: 'center'
	},
	title: {
		fontSize: 22,
		marginTop: 30,
		marginBottom: 10,
		color: colors.fontPrimary,
		textAlign: 'center',
		...fontStyles.bold
	},
	subtitle: {
		width: 295,
		fontSize: 16,
		lineHeight: 23,
		marginBottom: 20,
		color: colors.copy,
		textAlign: 'center',
		...fontStyles.normal
	},
	foxWrapper: {
		width: 100,
		marginTop: 30,
		marginBottom: 30,
		height: 100
	},
	image: {
		alignSelf: 'center',
		width: 100,
		height: 100
	}
});

/**
 * View that is displayed to first time (new) users
 * while their wallet is created
 */
class CreateWallet extends Component {
	static navigationOptions = () => ({
		headerStyle: {
			shadowColor: 'transparent',
			elevation: 0,
			backgroundColor: 'white',
			borderBottomWidth: 0
		},
		headerLeft: null,
		headerRight: null,
		headerTitle: null
	});

	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object,
		/**
		 * Action to reset the flag passwordSet in redux
		 */
		passwordUnset: PropTypes.func,
		/**
		 * Action to reset the flag seedphraseBackedUp in redux
		 */
		seedphraseNotBackedUp: PropTypes.func
	};

	componentDidMount() {
		InteractionManager.runAfterInteractions(async () => {
			const { KeyringController } = Engine.context;

			await KeyringController.createNewVaultAndKeychain('');
			await SecureKeychain.setGenericPassword('metamask-user', '');
			await AsyncStorage.removeItem('@MetaMask:biometryChoice');
			await AsyncStorage.setItem('@MetaMask:existingUser', 'true');
			// Making sure we reset the flag while going to
			// the first time flow
			this.props.passwordUnset();
			this.props.seedphraseNotBackedUp();
			setTimeout(() => {
				this.props.navigation.navigate('HomeNav');
			}, 1000);
		});
	}

	render() {
		return (
			<ScrollView style={styles.flex} contentContainerStyle={styles.flex} testID={'onboarding-screen'}>
				<View style={styles.wrapper}>
					<View style={styles.content}>
						<View style={styles.foxWrapper}>
							{Platform.OS === 'android' ? (
								<Image
									source={require('../../../images/fox.png')}
									style={styles.image}
									resizeMethod={'auto'}
								/>
							) : (
								<AnimatedFox />
							)}
						</View>
						<ActivityIndicator
							size="large"
							color={Platform.OS === 'android' ? colors.primary : colors.grey}
						/>
						<Text style={styles.title}>{strings('create_wallet.title')}</Text>
						<Text style={styles.subtitle}>{strings('create_wallet.subtitle')}</Text>
					</View>
				</View>
			</ScrollView>
		);
	}
}

const mapDispatchToProps = dispatch => ({
	passwordUnset: () => dispatch(passwordUnset()),
	seedphraseNotBackedUp: () => dispatch(seedphraseNotBackedUp())
});

export default connect(
	null,
	mapDispatchToProps
)(CreateWallet);
