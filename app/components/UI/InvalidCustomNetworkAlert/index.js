import React from 'react';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import StyledButton from '../StyledButton';
import PropTypes from 'prop-types';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		borderRadius: 10,
		padding: 20,
	},
	titleWrapper: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100,
	},
	title: {
		textAlign: 'center',
		fontSize: 17,
		marginVertical: 12,
		marginHorizontal: 20,
		color: colors.fontPrimary,
		...fontStyles.bold,
	},
	textWrapper: {
		marginTop: 20,
		marginBottom: 40,
	},
	text: {
		textAlign: 'center',
		fontSize: 15,
		lineHeight: 20,
		marginBottom: 20,
		...fontStyles.normal,
	},
	hint: {
		textAlign: 'center',
		fontSize: 15,
		lineHeight: 20,
		...fontStyles.normal,
	},
	link: {
		color: colors.blue,
	},
	button: {
		marginBottom: 10,
	},
});

const InvalidCustomNetworkAlert = (props) => {
	const closeModal = () => props.onClose();

	const goToEditNetwork = () => {
		closeModal();
		props.navigation.navigate('SettingsView', { screen: 'NetworkSettings', params: { network: props.network } });
	};

	const openLink = () => {
		closeModal();
		props.navigation.navigate('Webview', { screen: 'SimpleWebview', params: { url: 'https://chainid.network' } });
	};

	return (
		<SafeAreaView testID={'invalid-custom-network-alert'}>
			<View style={styles.wrapper}>
				<View style={styles.titleWrapper}>
					<Text style={styles.title}>{strings('invalid_network.title', { network: props.network })}</Text>
				</View>
				<View style={styles.textWrapper}>
					<Text style={styles.text}>
						<Text>{strings('invalid_network.message')}</Text>
					</Text>
					<Text style={styles.hint}>
						{strings('invalid_network.hint')}
						<Text style={styles.link} onPress={openLink}>
							chainId.network
						</Text>
						.
					</Text>
				</View>
				<View style={styles.button}>
					<StyledButton type={'confirm'} onPress={goToEditNetwork}>
						{strings('invalid_network.edit_network_button')}
					</StyledButton>
				</View>
				<View style={styles.button}>
					<StyledButton onPress={closeModal} type={'cancel'}>
						{strings('invalid_network.cancel')}
					</StyledButton>
				</View>
			</View>
		</SafeAreaView>
	);
};

InvalidCustomNetworkAlert.propTypes = {
	/**
	 * Object that represents the navigator
	 */
	navigation: PropTypes.object,
	/**
	 * Function to close the modal window
	 */
	onClose: PropTypes.func.isRequired,
	/**
	 * String that represents the invalid network
	 */
	network: PropTypes.string,
};

export default InvalidCustomNetworkAlert;
