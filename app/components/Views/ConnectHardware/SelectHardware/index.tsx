import React, { useEffect } from 'react';
import { View, SafeAreaView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { mockTheme, useAppThemeFromContext } from '../../../../util/theme';
import StyledButton from '../../../UI/StyledButton';
import { getClosableNavigationOptions } from '../../../UI/Navbar';
import { fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';

const createStyle = (colors: any) =>
	StyleSheet.create({
		container: {
			flex: 1,
			marginHorizontal: '5%',
			justifyContent: 'center',
		},
		topContainer: {
			flex: 2,
			width: '100%',
			alignItems: 'center',
			justifyContent: 'center',
		},
		middleContainer: {
			flex: 7,
			width: '100%',
			alignItems: 'center',
		},
		bottomContainer: {
			flex: 1,
			width: '100%',
			alignItems: 'center',
			justifyContent: 'space-between',
		},
		text: {
			...fontStyles.normal,
			color: colors.text.alternative,
		},
		box: {
			height: 125,
			width: 200,
			margin: 5,
			borderWidth: 1,
			borderRadius: 5,
			borderColor: colors.border.default,
			backgroundColor: colors.background.alternative,
		},
		button: {
			width: '100%',
		},
		// eslint-disable-next-line react-native/no-color-literals
		debugBorder: {
			borderColor: '#FF3D00',
			borderWidth: 1,
		},
	});

const SelectHardwareWallet = () => {
	const navigation = useNavigation();
	const { colors } = useAppThemeFromContext() || mockTheme;
	const styles = createStyle(colors);

	useEffect(() => {
		navigation.setOptions(
			getClosableNavigationOptions(strings('connect_hardware.title_select_hardware'), '', navigation, colors)
		);
	}, [navigation, colors]);

	const navigateToConnectQRWallet = () => {
		navigation.navigate('ConnectQRHardwareFlow');
	};

	const navigateToConnectLedger = () => {
		// eslint-disable-next-line no-console
		console.log('navigateToConnectLedger');
	};

	const navigateToConnectHardwareWallet = () => {
		// eslint-disable-next-line no-console
		console.log('navigateToConnectHardwareWallet');
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.topContainer}>
				<Text style={styles.text}>{strings('connect_hardware.select_hardware')}</Text>
			</View>
			<View style={styles.middleContainer}>
				<TouchableOpacity onPress={navigateToConnectLedger} style={styles.box}>
					<Text>Ledger</Text>
				</TouchableOpacity>
				<TouchableOpacity onPress={navigateToConnectQRWallet} style={styles.box}>
					<Text>QR-based</Text>
				</TouchableOpacity>
			</View>
			<View style={styles.bottomContainer}>
				<StyledButton
					containerStyle={[styles.button]}
					type={'confirm'}
					onPress={navigateToConnectHardwareWallet}
					disabled={false}
				>
					{strings('connect_hardware.continue')}
				</StyledButton>
			</View>
		</SafeAreaView>
	);
};

export default SelectHardwareWallet;
